"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";

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
  co_payment: string | null;
  insurance_covered_amount: string | null;
  product_list: string | null;
  valid_until: string | null;
  reason: string | null;
  street: string | null;
  house_number: string | null;
  post_code: string | null;
  city: string | null;
};

function formatDate(val: string | null) {
  if (!val) return "-";
  try { return format(new Date(val), "dd.MM.yyyy"); } catch { return val; }
}

function Cell({ value }: { value: string | null }) {
  return <td className="px-3 py-2 text-gray-700 whitespace-nowrap">{value ?? "-"}</td>;
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
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Created</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Category</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Type</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Health Insurance Provider</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Date of Letter</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Insurance Number</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">First Name</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Last Name</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Approval ID</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Co Payment</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Insurance Covered</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Product List</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Valid Until</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Reason</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Street</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">House No.</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">Post Code</th>
              <th className="text-left px-3 py-2 font-medium text-gray-600">City</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-gray-500">{formatDate(record.created_at)}</td>
                <td className="px-3 py-2">
                  {record.category ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[record.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {record.category}
                    </span>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-3 py-2">
                  {record.type ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[record.type] ?? "bg-gray-100 text-gray-700"}`}>
                      {record.type}
                    </span>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <Cell value={record.health_insurance_provider} />
                <td className="px-3 py-2 text-gray-700">{formatDate(record.date_of_letter)}</td>
                <td className="px-3 py-2 text-gray-600 font-mono">{record.insurance_number ?? "-"}</td>
                <Cell value={record.first_name} />
                <Cell value={record.last_name} />
                <td className="px-3 py-2 text-gray-600 font-mono">{record.approval_id ?? "-"}</td>
                <Cell value={record.co_payment} />
                <Cell value={record.insurance_covered_amount} />
                <td className="px-3 py-2 text-gray-700 max-w-[200px] truncate" title={record.product_list ?? ""}>{record.product_list ?? "-"}</td>
                <td className="px-3 py-2 text-gray-700">{formatDate(record.valid_until)}</td>
                <td className="px-3 py-2 text-gray-700 max-w-[180px] truncate" title={record.reason ?? ""}>{record.reason ?? "-"}</td>
                <Cell value={record.street} />
                <Cell value={record.house_number} />
                <Cell value={record.post_code} />
                <Cell value={record.city} />
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan={18} className="px-4 py-8 text-center text-gray-400">
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
