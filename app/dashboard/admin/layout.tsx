import { createClient } from "@/lib/supabase/server";
import { getUserRole } from "@/lib/auth/role";
import { redirect } from "next/navigation";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const role = await getUserRole(user.id);
  if (role !== "admin") redirect("/dashboard");

  return <>{children}</>;
}
