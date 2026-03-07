import { createClient } from "@/lib/supabase/server";
import EkvTable from "@/components/ekv/EkvTable";
import ImportModal from "@/components/ekv/ImportModal";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const KNOWN_STATUSES = ["Pending", "Approved", "Rejected", "Error", "Closed Lost"];

type Filters = {
  q?: string;
  kasse?: string;
  angelegt_from?: string;
  angelegt_to?: string;
  entschieden_from?: string;
  entschieden_to?: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters(query: any, filters: Filters) {
  const { q, kasse, angelegt_from, angelegt_to, entschieden_from, entschieden_to } = filters;
  if (kasse)            query = query.ilike("kassenname", `%${kasse}%`);
  if (q)                query = query.or(
    `versichertenvorname.ilike.%${q}%,versichertennachname.ilike.%${q}%,versicherten_nr.ilike.%${q}%,kvnr_noventi.ilike.%${q}%,kassenname.ilike.%${q}%,reasons.ilike.%${q}%`
  );
  if (angelegt_from)    query = query.gte("kv_angelegt", angelegt_from);
  if (angelegt_to)      query = query.lte("kv_angelegt", angelegt_to);
  if (entschieden_from) query = query.gte("kv_entschieden", entschieden_from);
  if (entschieden_to)   query = query.lte("kv_entschieden", entschieden_to);
  return query;
}

export default async function EkvPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string; q?: string; kasse?: string; angelegt_from?: string; angelegt_to?: string; entschieden_from?: string; entschieden_to?: string; audit_filter?: string; page_size?: string }>;
}) {
  const supabase = await createClient();
  const { status, page: pageParam, q, kasse, angelegt_from, angelegt_to, entschieden_from, entschieden_to, audit_filter, page_size } = await searchParams;
  const page = parseInt(pageParam ?? "1");
  const allowedSizes = [10, 50, 100, 200];
  const pageSize = allowedSizes.includes(Number(page_size)) ? Number(page_size) : 50;
  const from = (page - 1) * pageSize;
  const filters: Filters = { q, kasse, angelegt_from, angelegt_to, entschieden_from, entschieden_to };

  // Main records query (with status filter + pagination)
  let recordsQuery = supabase
    .from("ekv_records")
    .select(
      "id, kv_angelegt, kv_entschieden, kvnr_noventi, kvnr_le, le_ik, le_kdnr, versichertenvorname, versichertennachname, versicherten_nr, kassen_ik, kassenname, notes, status, carebox_status, reasons, audit_date",
      { count: "exact" }
    )
    .order("kv_angelegt", { ascending: false })
    .range(from, from + pageSize - 1);

  recordsQuery = applyFilters(recordsQuery, filters);
  if (status) recordsQuery = recordsQuery.eq("status", status);
  if (audit_filter === "not_audited") recordsQuery = recordsQuery.is("audit_date", null);
  if (audit_filter === "today") {
    const today = new Date().toISOString().slice(0, 10);
    recordsQuery = recordsQuery.gte("audit_date", `${today}T00:00:00`).lte("audit_date", `${today}T23:59:59`);
  }

  // Per-status counts using same filters but WITHOUT status filter
  const statusCountsPromise = Promise.all(
    KNOWN_STATUSES.map(async (s) => {
      let q2 = supabase
        .from("ekv_records")
        .select("*", { count: "exact", head: true })
        .eq("status", s);
      q2 = applyFilters(q2, filters);
      const { count: c } = await q2;
      return { status: s, count: c ?? 0 };
    })
  );

  const [{ data: records, count }, statusCounts] = await Promise.all([
    recordsQuery,
    statusCountsPromise,
  ]);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EKV Records</h1>
          <p className="text-sm text-gray-500">{count ?? 0} total records</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/ekv/audit"
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle className="w-4 h-4" />
            Audit
          </Link>
          <ImportModal />
        </div>
      </div>
      <EkvTable
        records={records ?? []}
        total={count ?? 0}
        page={page}
        pageSize={pageSize}
        statusCounts={statusCounts}
      />
    </div>
  );
}
