import { createAdminClient, createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export type UserRole = "admin" | "support" | "scanner" | "custom";

export const ALL_PAGE_KEYS = ["overview", "ekv", "letter_all", "letter_upload", "logs"] as const;
export type PageKey = (typeof ALL_PAGE_KEYS)[number];

export async function getUserRole(userId: string): Promise<UserRole> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .single();
  return (data?.role as UserRole) ?? "support";
}

export async function getUserPageAccess(userId: string): Promise<string[]> {
  const role = await getUserRole(userId);
  if (role === "admin") return [...ALL_PAGE_KEYS];
  const admin = createAdminClient();
  const { data } = await admin
    .from("role_permissions")
    .select("page_key")
    .eq("role", role)
    .eq("enabled", true);
  return data?.map((r) => r.page_key) ?? ["overview"];
}

export async function requireAdmin(): Promise<NextResponse | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const role = await getUserRole(user.id);
  if (role !== "admin") return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return null;
}
