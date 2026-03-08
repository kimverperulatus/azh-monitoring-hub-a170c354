import { createAdminClient } from "@/lib/supabase/server";
import PermissionMatrix from "@/components/admin/PermissionMatrix";

export const dynamic = "force-dynamic";

export default async function PermissionsPage() {
  const admin = createAdminClient();
  const { data: perms } = await admin.from("role_permissions").select("*");

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Role Permissions</h1>
        <p className="text-sm text-gray-500">Control which pages each role can access</p>
      </div>
      <PermissionMatrix initialPermissions={perms ?? []} />
    </div>
  );
}
