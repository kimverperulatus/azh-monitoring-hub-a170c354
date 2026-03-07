import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("app_settings")
    .select("key, value");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const settings: Record<string, string> = {};
  for (const row of data ?? []) {
    settings[row.key] = row.value ?? "";
  }
  return NextResponse.json(settings);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json() as Record<string, string>;

  const admin = createAdminClient();
  const upserts = Object.entries(body).map(([key, value]) => ({ key, value }));

  const { error } = await admin
    .from("app_settings")
    .upsert(upserts, { onConflict: "key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
