import { createClient, createAdminClient } from "@/lib/supabase/server";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft, Download, AlertTriangle, Eye } from "lucide-react";

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
  const style = statusStyles[value] ?? "bg-brand-navy-50 text-brand-navy-700";
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

export default async function EkvAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
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
  let recordsQuery = supabase
    .from("ekv_records")
    .select(
      "id, kv_angelegt, kv_entschieden, kvnr_noventi, versicherten_nr, kassenname, status, carebox_status, audit_date",
    )
    .not("carebox_status", "is", null)
    .order("kv_angelegt", { ascending: false })
    .limit(100);

  const { data: mismatchRecords } = await recordsQuery;

  // Built-in Zoho raw value equivalences (fallback when status map is not configured)
  const ZOHO_BUILT_IN: Record<string, string> = {
    VERSCHICKT: "Pending",
    PENDING: "Pending",
    "VERSCHICKT/PENDING": "Pending",
    ABGELEHNT: "Rejected",
    REJECTED: "Rejected",
    "ABGELEHNT/REJECTED": "Rejected",
    GENEHMIGT: "Approved",
    APPROVED: "Approved",
    "GENEHMIGT/APPROVED": "Approved",
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

  // Build status counts from all mismatches
  const statusCounts: Record<string, number> = {};
  for (const r of mismatches) {
    const s = r.status ?? "Unknown";
    statusCounts[s] = (statusCounts[s] ?? 0) + 1;
  }

  // Apply status filter from search params
  const { status: filterStatus } = await searchParams;
  const filtered = filterStatus
    ? mismatches.filter((r) => (r.status ?? "Unknown") === filterStatus)
    : mismatches;

  const exportIds = filtered.map((r) => r.id).join(",");
  const exportUrl = `/api/ekv/export?ids=${exportIds}&fields=kv_angelegt,kv_entschieden,kvnr_noventi,versichertenvorname,versichertennachname,versicherten_nr,kassenname,status,carebox_status,reasons`;

  return (
    <div className="p-6 space-y-5">
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
        <div className="flex items-center gap-2">
          {filtered.length > 0 && (
            <a
              href={exportUrl}
              className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-4 h-4" />
              Export {filtered.length} Records
            </a>
          )}
        </div>
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

      {/* Status Filter Tabs */}
      {mismatches.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/dashboard/ekv/audit"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              !filterStatus
                ? "bg-brand-red-800 text-white"
                : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
          >
            All
            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${!filterStatus ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
              {mismatches.length}
            </span>
          </Link>
          {Object.entries(statusCounts)
            .sort((a, b) => b[1] - a[1])
            .map(([status, count]) => {
              const isActive = filterStatus === status;
              return (
                <Link
                  key={status}
                  href={`/dashboard/ekv/audit?status=${encodeURIComponent(status)}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-brand-red-800 text-white"
                      : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {status}
                  <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold ${isActive ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"}`}>
                    {count}
                  </span>
                </Link>
              );
            })}
        </div>
      )}

      {/* Table */}
      {mismatches.length === 0 ? (
        <div className="bg-green-50 border border-green-200 rounded-xl p-8 text-center">
          <p className="text-green-700 font-medium">All records match — no status mismatches found.</p>
          <p className="text-green-600 text-sm mt-1">Every record with a Carebox Status has a matching Status value.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-xs whitespace-nowrap">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">KV Angelegt</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">KV Entschieden</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">KVNr NOVENTI</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Versicherten-Nr</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Kassenname</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Status</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Carebox Status</th>
                <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Audit Date</th>
                <th className="px-3 py-2.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-amber-50 transition-colors">
                  <td className="px-3 py-2.5 text-gray-700">{formatDate(record.kv_angelegt)}</td>
                  <td className="px-3 py-2.5 text-gray-700">{formatDate(record.kv_entschieden)}</td>
                  <td className="px-3 py-2.5 text-gray-600 font-mono">{record.kvnr_noventi ?? "-"}</td>
                  <td className="px-3 py-2.5 text-gray-600 font-mono">{record.versicherten_nr ?? "-"}</td>
                  <td className="px-3 py-2.5 text-gray-700">{record.kassenname ?? "-"}</td>
                  <td className="px-3 py-2.5">
                    <StatusBadge value={record.status} />
                  </td>
                  <td className="px-3 py-2.5">
                    <StatusBadge value={record.carebox_status} />
                  </td>
                  <td className="px-3 py-2.5 text-gray-600">{formatDate(record.audit_date)}</td>
                  <td className="px-3 py-2.5">
                    <Link
                      href={`/dashboard/ekv/${record.id}`}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium bg-brand-navy-50 text-brand-navy-700 hover:bg-brand-navy-100 transition-colors"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Link>
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
