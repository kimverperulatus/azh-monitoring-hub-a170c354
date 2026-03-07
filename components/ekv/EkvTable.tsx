"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Download, Search, RefreshCw } from "lucide-react";
import { useState, useCallback } from "react";

const EXPORT_FIELDS = [
  { key: "kv_angelegt",          label: "KV Angelegt" },
  { key: "kv_entschieden",       label: "KV Entschieden" },
  { key: "kvnr_noventi",         label: "KVNr NOVENTI" },
  { key: "kvnr_le",              label: "KVNr LE" },
  { key: "le_ik",                label: "LE IK" },
  { key: "le_kdnr",              label: "LE KdNr" },
  { key: "versichertenvorname",  label: "Vorname" },
  { key: "versichertennachname", label: "Nachname" },
  { key: "versicherten_nr",      label: "Versicherten-Nr" },
  { key: "kassen_ik",            label: "Kassen IK" },
  { key: "kassenname",           label: "Kassenname" },
  { key: "status",               label: "Status" },
  { key: "carebox_status",       label: "Carebox Status" },
  { key: "reasons",              label: "Reasons" },
  { key: "notes",                label: "Notes" },
];

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
  carebox_status: string | null;
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
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(EXPORT_FIELDS.map((f) => f.key));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const MAX_SELECTION = 200;
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupResult, setLookupResult] = useState<{ updated: number; notFound: number; statusChanged: number } | null>(null);
  const [lookupError, setLookupError] = useState("");

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
  const hasAnyFilter = activeStatus || searchQuery || kasseFilter || hasDateFilters;

  function clearAllFilters() {
    router.push(pathname);
  }

  function clearDateFilters() {
    const params = new URLSearchParams(searchParams.toString());
    ["angelegt_from", "angelegt_to", "entschieden_from", "entschieden_to"].forEach((k) => params.delete(k));
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }

  function doExport() {
    const params = new URLSearchParams();
    if (selectedIds.size > 0) {
      params.set("ids", Array.from(selectedIds).join(","));
    } else {
      if (activeStatus)    params.set("status", activeStatus);
      if (searchQuery)     params.set("q", searchQuery);
      if (kasseFilter)     params.set("kasse", kasseFilter);
      if (angelegtFrom)    params.set("angelegt_from", angelegtFrom);
      if (angelegtTo)      params.set("angelegt_to", angelegtTo);
      if (entschiedenFrom) params.set("entschieden_from", entschiedenFrom);
      if (entschiedenTo)   params.set("entschieden_to", entschiedenTo);
    }
    params.set("fields", selectedFields.join(","));
    window.location.href = `/api/ekv/export?${params.toString()}`;
    setShowExportModal(false);
  }

  function toggleField(key: string) {
    setSelectedFields((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  function toggleRow(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else if (next.size < MAX_SELECTION) {
        next.add(id);
      }
      return next;
    });
  }

  function togglePageAll() {
    const pageIds = records.map((r) => r.id);
    const allSelected = pageIds.every((id) => selectedIds.has(id));
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allSelected) {
        pageIds.forEach((id) => next.delete(id));
      } else {
        for (const id of pageIds) {
          if (next.size >= MAX_SELECTION) break;
          next.add(id);
        }
      }
      return next;
    });
  }

  const lookupCarebox = useCallback(async () => {
    if (!selectedIds.size) return;
    setLookupLoading(true);
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await fetch("/api/zoho/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!res.ok) {
        setLookupError(json.error ?? "Lookup failed.");
      } else {
        setLookupResult({ updated: json.updated, notFound: json.notFound, statusChanged: json.statusChanged ?? 0 });
        router.refresh();
      }
    } catch (err) {
      setLookupError(`Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setLookupLoading(false);
    }
  }, [selectedIds, router]);

  function exportSelected() {
    const params = new URLSearchParams();
    params.set("ids", Array.from(selectedIds).join(","));
    params.set("fields", selectedFields.join(","));
    window.location.href = `/api/ekv/export?${params.toString()}`;
  }

  const pageAllSelected = records.length > 0 && records.every((r) => selectedIds.has(r.id));
  const pagePartialSelected = records.some((r) => selectedIds.has(r.id)) && !pageAllSelected;

  const activeStatusCounts = statusCounts.filter((s) => s.count > 0);
  const grandTotal = statusCounts.reduce((sum, s) => sum + s.count, 0);

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
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
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
          suppressHydrationWarning
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="px-3 py-1.5 rounded-lg text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors whitespace-nowrap"
            suppressHydrationWarning
          >
            Clear Filters
          </button>
        )}
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

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-4 py-2.5">
            <span className="text-sm text-blue-700 font-medium">
              {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
              {selectedIds.size >= MAX_SELECTION && (
                <span className="ml-2 text-xs text-blue-500">(max {MAX_SELECTION})</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={lookupCarebox}
                disabled={lookupLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors"
                suppressHydrationWarning
              >
                {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {lookupLoading ? "Looking up..." : "Lookup Carebox Status"}
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors"
                suppressHydrationWarning
              >
                <Download className="w-3.5 h-3.5" />
                Export Selected
              </button>
              <button
                onClick={() => { setSelectedIds(new Set()); setLookupResult(null); setLookupError(""); }}
                className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                suppressHydrationWarning
              >
                Clear
              </button>
            </div>
          </div>
          {lookupError && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2.5 text-sm text-red-700">
              {lookupError}
            </div>
          )}
          {lookupResult && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2.5 text-sm text-green-700 space-y-1">
              <div>
                Lookup complete: <strong>{lookupResult.updated}</strong> record{lookupResult.updated !== 1 ? "s" : ""} found in Zoho
                {lookupResult.notFound > 0 && (
                  <span className="ml-2 text-green-600">({lookupResult.notFound} not found)</span>
                )}
              </div>
              {lookupResult.statusChanged > 0 && (
                <div className="text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 text-xs inline-block">
                  ⚠ <strong>{lookupResult.statusChanged}</strong> record{lookupResult.statusChanged !== 1 ? "s" : ""} had mismatched status — Status field auto-corrected via mapping
                </div>
              )}
              {lookupResult.statusChanged === 0 && lookupResult.updated > 0 && (
                <div className="text-green-600 text-xs">All statuses match — no corrections needed</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 w-10">
                <input
                  type="checkbox"
                  checked={pageAllSelected}
                  ref={(el) => { if (el) el.indeterminate = pagePartialSelected; }}
                  onChange={togglePageAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  suppressHydrationWarning
                />
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KV angelegt</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KV entschieden</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KVNr NOVENTI</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">KVNr LE</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Kassenname</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Carebox Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => (
              <tr
                key={record.id}
                className={`hover:bg-blue-50 cursor-pointer ${selectedIds.has(record.id) ? "bg-blue-50" : ""}`}
                onClick={() => router.push(`/dashboard/ekv/${record.id}`)}
              >
                <td className="px-4 py-3" onClick={(e) => { e.stopPropagation(); if ((e.target as HTMLElement).tagName !== "INPUT") toggleRow(record.id); }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(record.id)}
                    onChange={() => toggleRow(record.id)}
                    disabled={!selectedIds.has(record.id) && selectedIds.size >= MAX_SELECTION}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                    suppressHydrationWarning
                  />
                </td>
                <td className="px-4 py-3 text-gray-700">{formatDate(record.kv_angelegt)}</td>
                <td className="px-4 py-3 text-gray-700">{formatDate(record.kv_entschieden)}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.kvnr_noventi ?? "-"}</td>
                <td className="px-4 py-3 text-gray-600 font-mono text-xs">{record.kvnr_le ?? "-"}</td>
                <td className="px-4 py-3 text-gray-700">{record.kassenname ?? "-"}</td>
                <td className="px-4 py-3 text-gray-500 max-w-[200px]">
                  {record.reasons ? (
                    <span className="block truncate text-xs" title={record.reasons}>{record.reasons}</span>
                  ) : "-"}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {record.carebox_status ? (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusStyle(record.carebox_status)}`}>
                      {record.carebox_status}
                    </span>
                  ) : (
                    <span className="text-gray-400 text-xs">-</span>
                  )}
                </td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
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

      {/* Export field selection modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Export CSV</h2>
            <p className="text-sm text-gray-500 mb-4">Select the fields to include in the export.</p>
            <div className="grid grid-cols-2 gap-2 mb-5">
              {EXPORT_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedFields.includes(f.key)}
                    onChange={() => toggleField(f.key)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {f.label}
                </label>
              ))}
            </div>
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setSelectedFields(EXPORT_FIELDS.map((f) => f.key))}
                className="text-xs text-blue-600 hover:underline"
              >
                Select all
              </button>
              <button
                onClick={() => setSelectedFields([])}
                className="text-xs text-gray-500 hover:underline"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={doExport}
                disabled={selectedFields.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition-colors disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 border border-gray-300 text-gray-700 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
