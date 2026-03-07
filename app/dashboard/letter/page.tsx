import { createClient } from "@/lib/supabase/server";
import LetterTable from "@/components/letter/LetterTable";
import PdfUploadModal from "@/components/letter/PdfUploadModal";
import { getUserRole } from "@/lib/auth/role";

export const dynamic = "force-dynamic";

export default async function LetterPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; scan_date?: string; scan_status?: string; category?: string; type?: string; provider?: string; search?: string }>;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : "support";
  const { page: pageParam, scan_date, scan_status, category, type, provider, search } = await searchParams;
  const page = parseInt(pageParam ?? "1");
  const pageSize = 50;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("letter_records")
    .select(
      "id, created_at, category, type, health_insurance_provider, date_of_letter, insurance_number, first_name, last_name, approval_id, valid_until, file_name, scan_status, ai_summary",
      { count: "exact" }
    )
    .order("created_at", { ascending: false });

  if (scan_date) {
    query = query.gte("created_at", `${scan_date}T00:00:00`).lt("created_at", `${scan_date}T23:59:59.999`);
  }
  if (scan_status === "success" || scan_status === "error") {
    query = query.eq("scan_status", scan_status);
  }
  if (category) {
    query = query.ilike("category", `%${category}%`);
  }
  if (type) {
    query = query.eq("type", type);
  }
  if (provider) {
    query = query.ilike("health_insurance_provider", `%${provider}%`);
  }
  if (search) {
    query = query.or(
      ["first_name", "last_name", "insurance_number", "health_insurance_provider", "approval_id", "file_name", "ai_summary", "product_list", "reason", "city", "street", "post_code"]
        .map((col) => `${col}.ilike.%${search}%`)
        .join(",")
    );
  }

  const { data: records, count } = await query.range(from, from + pageSize - 1);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Scan Letter</h1>
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
        scanDate={scan_date ?? ""}
        scanStatus={scan_status ?? ""}
        filterCategory={category ?? ""}
        filterType={type ?? ""}
        filterProvider={provider ?? ""}
        filterSearch={search ?? ""}
      />
    </div>
  );
}
