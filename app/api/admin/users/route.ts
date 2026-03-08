import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/role";

export async function GET() {
  const denied = await requireAdmin();
  if (denied) return denied;

  const admin = createAdminClient();
  const { data: { users }, error } = await admin.auth.admin.listUsers({ perPage: 1000 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: profiles } = await admin.from("profiles").select("id, role");
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.role]));

  const result = users.map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    role: profileMap[u.id] ?? "support",
  }));

  return NextResponse.json({ users: result });
}

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { email, password, role } = await request.json();
  if (!email || !password)
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 });

  const validRoles = ["admin", "support", "scanner", "custom"];
  const assignedRole = validRoles.includes(role) ? role : "support";

  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  await admin.from("profiles").insert({ id: data.user.id, role: assignedRole });

  return NextResponse.json({ ok: true, user: { id: data.user.id, email: data.user.email, role: assignedRole, created_at: data.user.created_at } });
}
