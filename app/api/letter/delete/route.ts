import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/role";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { ids } = await request.json() as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });

  const admin = createAdminClient();
  const { error } = await admin.from("letter_records").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: ids.length });
}
