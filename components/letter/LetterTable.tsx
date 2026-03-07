"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Eye } from "lucide-react";

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
}: {
  records: LetterRecord[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Type</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Health Insurance Provider</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Date of Letter</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Insurance Number</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">First Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Last Name</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Approval ID</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Valid Until</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
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
            ))}
            {!records.length && (
              <tr>
                <td colSpan={10} className="px-4 py-8 text-center text-gray-400">
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
