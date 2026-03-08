import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Define allowed columns per table to strip unknown columns from old data
const ALLOWED_COLUMNS: Record<string, string[]> = {
  ekv_records: [
    "id", "payload", "created_at", "updated_at", "kv_angelegt", "kv_entschieden",
    "audit_date", "versichertennachname", "versichertenvorname", "versicherten_nr",
    "kassen_ik", "status", "kassenname", "error_message", "reasons", "notes",
    "kvnr_noventi", "kvnr_le", "le_ik", "le_kdnr",
  ],
  letter_records: [
    "id", "payload", "created_at", "updated_at", "type", "scan_status",
    "process_status", "uploader_name", "status", "recipient", "ai_summary",
    "error_message", "date_of_letter", "uploaded_at", "uploaded_by", "pdf_url",
    "category",
  ],
  activity_logs: [
    "id", "action", "module", "timestamp", "user_id", "record_id",
  ],
  role_permissions: [
    "id", "allowed", "page_key", "role", "enabled",
  ],
};

// Define the unique conflict column(s) per table
const CONFLICT_COLUMNS: Record<string, string> = {
  ekv_records: "id",
  letter_records: "id",
  activity_logs: "id",
  role_permissions: "role,page_key",
};

function stripUnknownColumns(rows: any[], allowedCols: string[]): any[] {
  return rows.map(row => {
    const cleaned: Record<string, any> = {};
    for (const col of allowedCols) {
      if (col in row) {
        cleaned[col] = row[col];
      }
    }
    return cleaned;
  });
}

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
    const tablesToMigrate = tables || ["ekv_records", "letter_records", "activity_logs", "role_permissions"];

    const results: Record<string, { migrated: number; error?: string }> = {};

    for (const table of tablesToMigrate) {
      try {
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

        // Strip columns that don't exist in the new schema
        const allowedCols = ALLOWED_COLUMNS[table];
        if (allowedCols) {
          allRows = stripUnknownColumns(allRows, allowedCols);
        }

        // Null out foreign key references to old auth.users IDs
        if (table === "letter_records") {
          allRows = allRows.map(row => ({ ...row, uploaded_by: null }));
        }

        const conflictCol = CONFLICT_COLUMNS[table] || "id";

        let totalMigrated = 0;
        const chunkSize = 100;

        for (let i = 0; i < allRows.length; i += chunkSize) {
          const chunk = allRows.slice(i, i + chunkSize);
          const { error: insertError } = await newDb
            .from(table)
            .upsert(chunk, { onConflict: conflictCol });

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
