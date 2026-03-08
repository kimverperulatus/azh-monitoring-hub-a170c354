import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const OLD_URL = Deno.env.get("OLD_SUPABASE_URL");
    const OLD_KEY = Deno.env.get("OLD_SUPABASE_SERVICE_ROLE_KEY");
    const NEW_URL = Deno.env.get("SUPABASE_URL");
    const NEW_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!OLD_URL || !OLD_KEY) throw new Error("Old Supabase credentials not configured");
    if (!NEW_URL || !NEW_KEY) throw new Error("New Supabase credentials not configured");

    const oldDb = createClient(OLD_URL, OLD_KEY);
    const newDb = createClient(NEW_URL, NEW_KEY);

    const { tables } = await req.json();
    const tablesToMigrate = tables || ["profiles", "ekv_records", "letter_records", "activity_logs", "role_permissions"];

    const results: Record<string, { migrated: number; error?: string }> = {};

    for (const table of tablesToMigrate) {
      try {
        // Fetch all from old DB (paginate in chunks of 500)
        let allRows: any[] = [];
        let offset = 0;
        const limit = 500;

        while (true) {
          const { data, error } = await oldDb
            .from(table)
            .select("*")
            .range(offset, offset + limit - 1);

          if (error) throw error;
          if (!data || data.length === 0) break;

          allRows = [...allRows, ...data];
          offset += limit;
          if (data.length < limit) break;
        }

        if (allRows.length === 0) {
          results[table] = { migrated: 0 };
          continue;
        }

        // For profiles table, we need to handle conflicts (user might already exist)
        // Use upsert to avoid duplicate key errors
        let totalMigrated = 0;
        const chunkSize = 100;

        for (let i = 0; i < allRows.length; i += chunkSize) {
          const chunk = allRows.slice(i, i + chunkSize);
          const { error: insertError } = await newDb
            .from(table)
            .upsert(chunk, { onConflict: "id" });

          if (insertError) {
            console.error(`Error inserting into ${table}:`, insertError);
            throw insertError;
          }
          totalMigrated += chunk.length;
        }

        results[table] = { migrated: totalMigrated };
      } catch (err: any) {
        results[table] = { migrated: 0, error: err.message };
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Migration error:", err);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
