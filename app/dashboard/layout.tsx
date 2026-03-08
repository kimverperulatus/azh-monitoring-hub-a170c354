import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import { getUserRole, getUserPageAccess } from "@/lib/auth/role";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [role, allowedPages] = await Promise.all([
    getUserRole(user.id),
    getUserPageAccess(user.id),
  ]);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <Navbar user={user} role={role} allowedPages={allowedPages} />
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
