"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Eye, Trash2, CheckCircle2, AlertCircle } from "lucide-react";
import { useState } from "react";

type LetterRecord = {
  id: string;
  created_at: string;
  category: string | null;
  type: string | null;
  health_insurance_provider: string | null;
  date_of_letter: string | null;
  insurance_number: string | null;
  first_name: string | null;
  last_name: string | null;
  approval_id: string | null;
  valid_until: string | null;
  file_name: string | null;
  scan_status: string | null;
  ai_summary: string | null;
};

function formatDate(val: string | null) {
  if (!val) return "-";
  try { return format(new Date(val), "dd.MM.yyyy"); } catch { return val; }
}

const CATEGORY_STYLES: Record<string, string> = {
  "Carebox":       "bg-blue-50 text-blue-700",
  "Reusable Pads": "bg-purple-50 text-purple-700",
};

const TYPE_STYLES: Record<string, string> = {
  "Approved":     "bg-green-100 text-green-700",
  "Reject":       "bg-red-100 text-red-700",
  "Terminations": "bg-gray-100 text-gray-600",
};

export default function LetterTable({
  records,
  total,
  page,
  pageSize,
  isAdmin = false,
}: {
  records: LetterRecord[];
  total: number;
  page: number;
  pageSize: number;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selectedIds.size === records.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(records.map((r) => r.id)));
    }
  }

  async function handleDelete() {
    if (!selectedIds.size) return;
    if (!confirm(`Delete ${selectedIds.size} record(s)? This cannot be undone.`)) return;
    setDeleting(true);
    setDeleteError("");
    const res = await fetch("/api/letter/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [...selectedIds] }),
    });
    const json = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setDeleteError(json.error ?? "Delete failed.");
    } else {
      setSelectedIds(new Set());
      router.refresh();
    }
  }

  const allSelected = records.length > 0 && selectedIds.size === records.length;

  return (
    <div className="space-y-4">
      {isAdmin && selectedIds.size > 0 && (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-sm text-red-700 font-medium">
            {selectedIds.size} record{selectedIds.size > 1 ? "s" : ""} selected
          </span>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
            {deleting ? "Deleting..." : "Delete Selected"}
          </button>
          {deleteError && <span className="text-sm text-red-600">{deleteError}</span>}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {isAdmin && (
                <th className="px-4 py-3 w-8">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Health Insurance Provider</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date of Letter</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Insurance Number</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">First Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Approval ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Valid Until</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">File Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Scan</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">AI Summary</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => {
              const selected = selectedIds.has(record.id);
              return (
                <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${selected ? "bg-red-50" : ""}`}>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(record.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    {record.category ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[record.category] ?? "bg-gray-100 text-gray-700"}`}>
                        {record.category}
                      </span>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    {record.type ? (
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[record.type] ?? "bg-gray-100 text-gray-700"}`}>
                        {record.type}
                      </span>
                    ) : <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{record.health_insurance_provider ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(record.date_of_letter)}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.insurance_number ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{record.first_name ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{record.last_name ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.approval_id ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(record.valid_until)}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate" title={record.file_name ?? ""}>{record.file_name ?? "-"}</td>
                  <td className="px-4 py-3">
                    {record.scan_status === "success" && (
                      <span className="flex items-center gap-1 text-xs font-medium text-green-700">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Success
                      </span>
                    )}
                    {record.scan_status === "error" && (
                      <span className="flex items-center gap-1 text-xs font-medium text-red-600">
                        <AlertCircle className="w-3.5 h-3.5" /> Error
                      </span>
                    )}
                    {!record.scan_status && <span className="text-gray-400 text-xs">-</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs max-w-[220px]">
                    {record.ai_summary ? (
                      <span className="line-clamp-2 leading-relaxed" title={record.ai_summary}>{record.ai_summary}</span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/letter/${record.id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!records.length && (
              <tr>
                <td colSpan={isAdmin ? 14 : 13} className="px-4 py-8 text-center text-gray-400">
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>Page {page} of {totalPages} · {total} total records</span>
          <div className="flex gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-sm"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-40 text-sm"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
