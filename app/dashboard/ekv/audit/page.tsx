import { createClient, createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Download, AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  Pending:       "bg-yellow-100 text-yellow-700",
  Approved:      "bg-green-100 text-green-700",
  Rejected:      "bg-red-100 text-red-700",
  Error:         "bg-orange-100 text-orange-700",
  "Closed Lost": "bg-gray-100 text-gray-600",
};

function StatusBadge({ value }: { value: string | null }) {
  if (!value) return <span className="text-gray-400 text-xs">-</span>;
  const style = statusStyles[value] ?? "bg-blue-50 text-blue-700";
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${style}`}>
      {value}
    </span>
  );
}

function formatDate(val: string | null) {
  if (!val) return "-";
  try { return format(new Date(val), "dd.MM.yyyy"); } catch { return val; }
}

export default async function EkvAuditPage() {
  const supabase = await createClient();
  const admin = createAdminClient();

  // Load status mapping from app_settings
  const { data: settingsRows } = await admin.from("app_settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value ?? "";
  let statusMap: Record<string, string> = {};
  if (settings.zoho_status_map) {
    try { statusMap = JSON.parse(settings.zoho_status_map); } catch { /* ignore */ }
  }

  // Column-to-column comparison must be done in-memory (PostgREST can't do WHERE col1 != col2)
  const { data: mismatchRecords } = await supabase
    .from("ekv_records")
    .select(
      "id, kv_angelegt, kv_entschieden, kvnr_noventi, versichertenvorname, versichertennachname, versicherten_nr, kassenname, status, carebox_status, reasons",
    )
    .not("carebox_status", "is", null)
    .order("kv_angelegt", { ascending: false });

  // Built-in Zoho raw value equivalences (fallback when status map is not configured)
  const ZOHO_BUILT_IN: Record<string, string> = {
    VERSCHICKT: "Pending",
    PENDING: "Pending",
  };

  function resolveCarebox(careboxStatus: string): string {
    return statusMap[careboxStatus]
      ?? ZOHO_BUILT_IN[careboxStatus.toUpperCase()]
      ?? careboxStatus;
  }

  // Resolve carebox_status through mapping (with built-in fallbacks) before comparing
  const mismatches = (mismatchRecords ?? []).filter((r) => {
    if (!r.carebox_status) return false;
    const resolved = resolveCarebox(r.carebox_status);
    return r.status?.toLowerCase() !== resolved.toLowerCase();
  });

  const exportIds = mismatches.map((r) => r.id).join(",");
  const exportUrl = `/api/ekv/export?ids=${exportIds}&fields=kv_angelegt,kv_entschieden,kvnr_noventi,versichertenvorname,versichertennachname,versicherten_nr,kassenname,status,carebox_status,reasons`;

  return (
    <div className="p-6 space-y-5 max-w-7xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/ekv"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to EKV Records
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Status Mismatch Audit</h1>
            <p className="text-sm text-gray-500">
              Records where <strong>Status</strong> ≠ <strong>Carebox Status</strong>
            </p>
          </div>
        </div>
        {mismatches.length > 0 && (
          <a
            href={exportUrl}
            className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export {mismatches.length} Records
          </a>
        )}
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Total Mismatches</p>
          <p className="text-3xl font-bold text-amber-600 mt-1">{mismatches.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">With Carebox Status</p>
          <p className="text-3xl font-bold text-gray-800 mt-1">{(mismatchRecords ?? []).filter(r => r.carebox_status).length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Matching</p>
          <p className="text-3xl font-bold text-green-600 mt-1">
            {(mismatchRecords ?? []).filter(r => {
              if (!r.carebox_status) return false;
              const resolved = resolveCarebox(r.carebox_status);
              return r.status?.toLowerCase() === resolved.toLowerCase();
            }).length}
          </p>
        </div>
      </div>

      {/* Table */}
      {mismatches.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-green-700 font-medium">All records match — no status mismatches found.</p>
          <p className="text-green-600 text-sm mt-1">Every record with a Carebox Status has a matching Status value.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">KV Angelegt</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">KVNr NOVENTI</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Versicherten-Nr</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Kassenname</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Carebox Status</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {mismatches.map((record) => (
                <tr key={record.id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-4 py-3 text-gray-700">{formatDate(record.kv_angelegt)}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.kvnr_noventi ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">
                    {[record.versichertenvorname, record.versichertennachname].filter(Boolean).join(" ") || "-"}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.versicherten_nr ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-700">{record.kassenname ?? "-"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge value={record.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge value={record.carebox_status} />
                  </td>
                  <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                    {record.reasons ? (
                      <span className="block truncate text-xs" title={record.reasons}>{record.reasons}</span>
                    ) : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
