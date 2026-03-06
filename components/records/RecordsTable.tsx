"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import RecordActions from "./RecordActions";

type CareboxRecord = {
  id: string;
  status: string;
  created_at: string;
  updated_at: string;
  error_message?: string;
  [key: string]: unknown;
};

const statusStyles: Record<string, string> = {
  Pending:      "bg-yellow-100 text-yellow-700",
  Approved:     "bg-green-100 text-green-700",
  Rejected:     "bg-red-100 text-red-700",
  Error:        "bg-orange-100 text-orange-700",
  "Closed Lost": "bg-gray-100 text-gray-600",
};

const STATUSES = ["Pending", "Approved", "Rejected", "Error", "Closed Lost"];

export default function RecordsTable({
  records,
  module,
  total,
  page,
  pageSize,
}: {
  records: CareboxRecord[];
  module: "ekv" | "letter";
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setFilter(status: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (status) {
      params.set("status", status);
    } else {
      params.delete("status");
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
  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilter("")}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            activeStatus === ""
              ? "bg-blue-600 text-white"
              : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          All
        </button>
        {STATUSES.map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeStatus === s
                ? "bg-blue-600 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Updated</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Error</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-xs text-gray-400">{record.id}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[record.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(record.created_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(record.updated_at), { addSuffix: true })}
                </td>
                <td className="px-4 py-3 text-red-500 text-xs max-w-xs truncate">
                  {record.error_message ?? "-"}
                </td>
                <td className="px-4 py-3">
                  <RecordActions recordId={record.id} module={module} status={record.status} />
                </td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages}</span>
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
