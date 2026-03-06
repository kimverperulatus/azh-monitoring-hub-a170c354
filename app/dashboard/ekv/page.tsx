import { createClient } from "@/lib/supabase/server";
import EkvTable from "@/components/ekv/EkvTable";
import ImportModal from "@/components/ekv/ImportModal";

export default async function EkvPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string }>;
}) {
  const supabase = await createClient();
  const { status, page: pageParam, q } = await searchParams;
  const page = parseInt(pageParam ?? "1");
  const pageSize = 20;
  const from = (page - 1) * pageSize;

  let query = supabase
    .from("ekv_records")
    .select(
      "id, kv_angelegt, kv_entschieden, kvnr_noventi, kvnr_le, le_ik, le_kdnr, versichertenvorname, versichertennachname, versicherten_nr, kassen_ik, kassenname, status, reasons",
      { count: "exact" }
    )
    .order("kv_angelegt", { ascending: false })
    .range(from, from + pageSize - 1);

  if (status) query = query.eq("status", status);
  if (q) query = query.or(
    `versichertenvorname.ilike.%${q}%,versichertennachname.ilike.%${q}%,versicherten_nr.ilike.%${q}%,kvnr_noventi.ilike.%${q}%,kassenname.ilike.%${q}%`
  );

  const { data: records, count } = await query;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EKV Records</h1>
          <p className="text-sm text-gray-500">{count ?? 0} total records</p>
        </div>
        <ImportModal />
      </div>
      <EkvTable
        records={records ?? []}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
      />
    </div>
  );
}
