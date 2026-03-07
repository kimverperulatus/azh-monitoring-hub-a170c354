import { createAdminClient } from "@/lib/supabase/server";

export type UserRole = "admin" | "support";

export async function getUserRole(userId: string): Promise<UserRole> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as UserRole) ?? "admin";
}
