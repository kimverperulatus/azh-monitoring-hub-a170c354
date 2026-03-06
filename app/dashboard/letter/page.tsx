import { createClient } from "@/lib/supabase/server";
import RecordsTable from "@/components/records/RecordsTable";

export default async function LetterPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const supabase = await createClient();
  const { status, page: pageParam } = await searchParams;
  const page = parseInt(pageParam ?? "1");
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("letter_records")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (status) query = query.eq("status", status);

  const { data: records, count } = await query;

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Letter Records</h1>
        <p className="text-sm text-gray-500">{count ?? 0} total records</p>
      </div>
      <RecordsTable
        records={records ?? []}
        module="letter"
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
