"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";

type EkvRecord = {
  id: string;
  kv_angelegt: string | null;
  kv_entschieden: string | null;
  kvnr_noventi: string | null;
  kvnr_le: string | null;
  le_ik: string | null;
  le_kdnr: string | null;
  versichertenvorname: string | null;
  versichertennachname: string | null;
  versicherten_nr: string | null;
  kassen_ik: string | null;
  kassenname: string | null;
  notes: string | null;
  status: string;
  reasons: string | null;
};

const statusStyles: Record<string, string> = {
  Pending:       "bg-yellow-100 text-yellow-700",
  Approved:      "bg-green-100 text-green-700",
  Rejected:      "bg-red-100 text-red-700",
  Error:         "bg-orange-100 text-orange-700",
  "Closed Lost": "bg-gray-100 text-gray-600",
};

function getStatusStyle(status: string) {
  return statusStyles[status] ?? "bg-blue-50 text-blue-700";
}

function formatDate(val: string | null) {
  if (!val) return "-";
  try { return format(new Date(val), "dd.MM.yyyy"); } catch { return val; }
}

export default function EkvTable({
  records,
  total,
  page,
  pageSize,
  statusCounts = [],
}: {
  records: EkvRecord[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts?: { status: string; count: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeStatus = searchParams.get("status") ?? "";
  const searchQuery = searchParams.get("q") ?? "";
  const kasseFilter = searchParams.get("kasse") ?? "";
  const angelegtFrom = searchParams.get("angelegt_from") ?? "";
  const angelegtTo = searchParams.get("angelegt_to") ?? "";
  const entschiedenFrom = searchParams.get("entschieden_from") ?? "";
  const entschiedenTo = searchParams.get("entschieden_to") ?? "";
  const totalPages = Math.ceil(total / pageSize);

  const hasDateFilters = angelegtFrom || angelegtTo || entschiedenFrom || entschiedenTo;

  function clearDateFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["angelegt_from", "angelegt_to", "entschieden_from", "entschieden_to"].forEach((k) => params.delete(k));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  const activeStatusCounts = statusCounts.filter((s) => s.count > 0);
  const grandTotal = statusCounts.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="text"
          placeholder="Search by name, Versicherten-Nr, KVNr, Reason..."
          defaultValue={searchQuery}
          onKeyDown={(e) => {
            if (e.key === "Enter") setFilter("q", (e.target as HTMLInputElement).value);
          }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-72 focus:outline-none focus:ring-2 focus:ring-blue-500"
          suppressHydrationWarning
        />
        <input
          type="text"
          placeholder="Filter by Kassenname..."
          defaultValue={kasseFilter}
          onKeyDown={(e) => {
            if (e.key === "Enter") setFilter("kasse", (e.target as HTMLInputElement).value);
          }}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm w-full sm:w-56 focus:outline-none focus:ring-2 focus:ring-blue-500"
          suppressHydrationWarning
        />
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("status", "")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeStatus === "" ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            suppressHydrationWarning
          >
            All
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
              activeStatus === "" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {grandTotal}
            </span>
          </button>
          {activeStatusCounts.map(({ status: s, count: c }) => (
            <button
              key={s}
              onClick={() => setFilter("status", s)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                activeStatus === s ? "bg-blue-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
              }`}
              suppressHydrationWarning
            >
              {s}
              <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                activeStatus === s ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
              }`}>
                {c}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Filters */}
      <div className="flex flex-wrap items-end gap-4 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">KV Angelegt</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              defaultValue={angelegtFrom}
              onChange={(e) => setFilter("angelegt_from", e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              defaultValue={angelegtTo}
              onChange={(e) => setFilter("angelegt_to", e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500">KV Entschieden</span>
          <div className="flex items-center gap-2">
            <input
              type="date"
              defaultValue={entschiedenFrom}
              onChange={(e) => setFilter("entschieden_from", e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              defaultValue={entschiedenTo}
              onChange={(e) => setFilter("entschieden_to", e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
          </div>
        </div>
        {hasDateFilters && (
          <button
            onClick={clearDateFilters}
            className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KV angelegt</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KV entschieden</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KVNr NOVENTI</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KVNr LE</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kassenname</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Notes</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr
                key={record.id}
                className="hover:bg-blue-50 cursor-pointer"
                onClick={() => router.push(`/dashboard/ekv/${record.id}`)}
              >
                <td className="px-4 py-3 text-gray-700">{formatDate(record.kv_angelegt)}</td>
                <td className="px-4 py-3 text-gray-700">{formatDate(record.kv_entschieden)}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.kvnr_noventi ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.kvnr_le ?? "-"}</td>
                <td className="px-4 py-3 text-gray-700">{record.kassenname ?? "-"}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                  {record.notes ? (
                    <span className="block truncate text-xs" title={record.notes}>{record.notes}</span>
                  ) : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                    {record.status}
                  </span>
                </td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No EKV records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages} ({total} records)</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
