import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type UserRole = "admin" | "support";

export async function getUserRole(userId: string): Promise<UserRole> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as UserRole) ?? "support";
}

/**
 * Call at the top of admin API route handlers.
 * Returns null if the user is an authenticated admin.
 * Returns a 401/403 NextResponse if not authenticated or not admin.
 */
export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getUserRole(user.id);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
