import { createClient } from "@/lib/supabase/server";
import LetterTable from "@/components/letter/LetterTable";
import PdfUploadModal from "@/components/letter/PdfUploadModal";
import { getUserRole } from "@/lib/auth/role";

export const dynamic = "force-dynamic";

export default async function LetterPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : "support";
  const { page: pageParam } = await searchParams;
  const page = parseInt(pageParam ?? "1");
  const pageSize = 50;
  const from = (page - 1) * pageSize;

  const { data: records, count } = await supabase
    .from("letter_records")
    .select(
      "id, created_at, category, type, health_insurance_provider, date_of_letter, insurance_number, first_name, last_name, approval_id, valid_until",
      { count: "exact" }
    )
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Letter Records</h1>
          <p className="text-sm text-gray-500">{count ?? 0} total records</p>
        </div>
        <PdfUploadModal />
      </div>
      <LetterTable
        records={records ?? []}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        isAdmin={role === "admin"}
      />
    </div>
  );
}
