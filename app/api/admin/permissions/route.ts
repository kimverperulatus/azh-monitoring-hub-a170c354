import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/role";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  const { data } = await admin.from("role_permissions").select("*");
  return NextResponse.json({ permissions: data ?? [] });
}

export async function PATCH(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { role, page_key, enabled } = await request.json();
  const admin = createAdminClient();
  const { error } = await admin
    .from("role_permissions")
    .upsert({ role, page_key, enabled }, { onConflict: "role,page_key" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
