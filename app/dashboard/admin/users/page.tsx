import { createAdminClient } from "@/lib/supabase/server";
import UserManager from "@/components/admin/UserManager";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const admin = createAdminClient();
  const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
  const { data: profiles } = await admin.from("profiles").select("id, role");
  const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p.role]));

  const userList = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email ?? "",
    created_at: u.created_at,
    role: (profileMap[u.id] ?? "support") as string,
  }));

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-sm text-gray-500">{userList.length} user{userList.length !== 1 ? "s" : ""}</p>
      </div>
      <UserManager initialUsers={userList} />
    </div>
  );
}
