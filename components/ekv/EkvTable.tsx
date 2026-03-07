"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import { Download, Search, RefreshCw, Eye } from "lucide-react";
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
  audit_date: string | null;
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
  notAuditedCount = 0,
  emptyAfterAuditCount = 0,
}: {
  records: EkvRecord[];
  total: number;
  page: number;
  pageSize: number;
  statusCounts?: { status: string; count: number }[];
  notAuditedCount?: number;
  emptyAfterAuditCount?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedFields, setSelectedFields] = useState<string[]>(EXPORT_FIELDS.map((f) => f.key));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const MAX_SELECTION = 50;
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
  const auditFilter = searchParams.get("audit_filter") ?? "";
  const careboxFilter = searchParams.get("carebox_filter") ?? "";
  const totalPages = Math.ceil(total / pageSize);

  const hasDateFilters = angelegtFrom || angelegtTo || entschiedenFrom || entschiedenTo;
  const hasAnyFilter = activeStatus || searchQuery || hasDateFilters || auditFilter || careboxFilter;

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
        const errMsg = json.error ?? "Lookup failed.";
        setLookupError(errMsg.includes("Unexpected end of JSON") ? "No Record Found." : errMsg);
      } else {
        setLookupResult({ updated: json.updated, notFound: json.notFound, statusChanged: json.statusChanged ?? 0 });
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setLookupError(msg.includes("Unexpected end of JSON") ? "No Record Found." : `Error: ${msg}`);
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
    <div className="space-y-3">
      {/* Row 1: Search + actions */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search by name, Versicherten-Nr, KVNr, Kassenname, Reason..."
            defaultValue={searchQuery}
            onKeyDown={(e) => {
              if (e.key === "Enter") setFilter("q", (e.target as HTMLInputElement).value);
            }}
            className="w-full border border-gray-200 rounded-xl pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-navy-500 focus:border-transparent bg-white shadow-sm transition-shadow"
            suppressHydrationWarning
          />
        </div>
        <button
          onClick={() => setShowExportModal(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 active:scale-95 shadow-sm transition-all duration-150 whitespace-nowrap"
          suppressHydrationWarning
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
        {hasAnyFilter && (
          <button
            onClick={clearAllFilters}
            className="px-3.5 py-2 rounded-xl text-sm font-medium text-red-600 border border-red-200 hover:bg-red-50 active:scale-95 transition-all duration-150 whitespace-nowrap"
            suppressHydrationWarning
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Row 2: Status tabs */}
      <div className="flex flex-wrap gap-1.5">
        <button
          onClick={() => setFilter("status", "")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
            activeStatus === "" ? "bg-brand-red-800 text-white shadow-sm shadow-brand-red-200" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
          suppressHydrationWarning
        >
          All
          <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
            activeStatus === "" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
          }`}>
            {grandTotal}
          </span>
        </button>
        {activeStatusCounts.map(({ status: s, count: c }) => (
          <button
            key={s}
            onClick={() => setFilter("status", s)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 active:scale-95 ${
              activeStatus === s ? "bg-brand-red-800 text-white shadow-sm shadow-brand-red-200" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}
            suppressHydrationWarning
          >
            {s}
            <span className={`text-[11px] px-1.5 py-0.5 rounded-full font-bold ${
              activeStatus === s ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
            }`}>
              {c}
            </span>
          </button>
        ))}
      </div>

      {/* Row 3: Secondary filters + date ranges */}
      <div className="flex flex-wrap items-end gap-6 bg-white border border-gray-100 rounded-xl px-4 py-3 shadow-sm">
        {/* Carebox Status */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Carebox Status</span>
          <div className="flex gap-1.5">
            {[{ value: "", label: "All" }, { value: "empty", label: "Empty" }, { value: "empty_audited", label: "Empty after Audit", count: emptyAfterAuditCount }].map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setFilter("carebox_filter", value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  careboxFilter === value ? "bg-brand-navy-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                suppressHydrationWarning
              >
                {label}
                {count != null && count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                    careboxFilter === value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Audit Date quick filter */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Audit Date</span>
          <div className="flex gap-1.5">
            {[{ value: "", label: "All" }, { value: "not_audited", label: "Not Audited", count: notAuditedCount }, { value: "today", label: "Today" }].map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setFilter("audit_filter", value)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  auditFilter === value ? "bg-brand-navy-800 text-white" : "bg-white border border-gray-200 text-gray-600 hover:bg-gray-50"
                }`}
                suppressHydrationWarning
              >
                {label}
                {count != null && count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${
                    auditFilter === value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* KV Angelegt date range */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">KV Angelegt</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              defaultValue={angelegtFrom}
              onChange={(e) => setFilter("angelegt_from", e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="date"
              defaultValue={angelegtTo}
              onChange={(e) => setFilter("angelegt_to", e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
          </div>
        </div>

        {/* KV Entschieden date range */}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">KV Entschieden</span>
          <div className="flex items-center gap-1.5">
            <input
              type="date"
              defaultValue={entschiedenFrom}
              onChange={(e) => setFilter("entschieden_from", e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
            <span className="text-xs text-gray-400">–</span>
            <input
              type="date"
              defaultValue={entschiedenTo}
              onChange={(e) => setFilter("entschieden_to", e.target.value)}
              className="border border-gray-200 rounded-md px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              suppressHydrationWarning
            />
          </div>
        </div>

        {hasDateFilters && (
          <button
            onClick={clearDateFilters}
            className="px-2.5 py-1 text-xs text-red-600 hover:bg-red-50 border border-red-200 rounded-md transition-colors self-end"
          >
            Clear dates
          </button>
        )}
      </div>

      {/* Selection bar */}
      {selectedIds.size > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between bg-brand-navy-800 rounded-xl px-4 py-2.5 shadow-sm shadow-brand-navy-900">
            <span className="text-sm text-white font-medium">
              {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} selected
              {selectedIds.size >= MAX_SELECTION && (
                <span className="ml-2 text-xs text-blue-200">(max {MAX_SELECTION})</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={lookupCarebox}
                disabled={lookupLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-all duration-150 active:scale-95"
                suppressHydrationWarning
              >
                {lookupLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
                {lookupLoading ? "Looking up..." : "Lookup Carebox Status"}
              </button>
              <button
                onClick={() => setShowExportModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/15 hover:bg-white/25 text-white rounded-lg text-sm font-medium transition-all duration-150 active:scale-95"
                suppressHydrationWarning
              >
                <Download className="w-3.5 h-3.5" />
                Export Selected
              </button>
              <button
                onClick={() => { setSelectedIds(new Set()); setLookupResult(null); setLookupError(""); }}
                className="px-3 py-1.5 text-sm text-brand-navy-200 hover:text-white hover:bg-white/15 rounded-lg transition-all duration-150"
                suppressHydrationWarning
              >
                Clear
              </button>
            </div>
          </div>
          {lookupLoading && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 space-y-2">
              <div className="flex items-center gap-2 text-sm text-blue-700 font-medium">
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Looking up {selectedIds.size} record{selectedIds.size !== 1 ? "s" : ""} in Zoho CRM...
              </div>
              <div className="w-full bg-blue-100 rounded-full h-1 overflow-hidden">
                <div className="h-full w-1/3 bg-blue-500 rounded-full animate-[pulse_1s_ease-in-out_infinite]" />
              </div>
            </div>
          )}
          {lookupError && (
            <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-2.5 text-sm text-red-600 font-medium">
              {lookupError}
            </div>
          )}
          {lookupResult && (
            <div className="bg-green-50 border border-green-100 rounded-xl px-4 py-3 text-sm text-green-700 space-y-1.5">
              <div>
                Lookup complete: <strong>{lookupResult.updated}</strong> record{lookupResult.updated !== 1 ? "s" : ""} found in Zoho
                {lookupResult.notFound > 0 && (
                  <span className="ml-2 text-green-500 text-xs">({lookupResult.notFound} not found)</span>
                )}
              </div>
              {lookupResult.statusChanged > 0 && (
                <div className="text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1.5 text-xs inline-flex items-center gap-1">
                  <strong>{lookupResult.statusChanged}</strong> record{lookupResult.statusChanged !== 1 ? "s" : ""} had mismatched status — auto-corrected via mapping
                </div>
              )}
              {lookupResult.statusChanged === 0 && lookupResult.updated > 0 && (
                <div className="text-green-500 text-xs">All statuses match — no corrections needed</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-gray-100">
              <th className="px-3 py-2.5 w-8">
                <input
                  type="checkbox"
                  checked={pageAllSelected}
                  ref={(el) => { if (el) el.indeterminate = pagePartialSelected; }}
                  onChange={togglePageAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  suppressHydrationWarning
                />
              </th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap uppercase tracking-wide text-[10px]">KV Angelegt</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap uppercase tracking-wide text-[10px]">KV Entschieden</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap uppercase tracking-wide text-[10px]">KVNr NOVENTI</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap uppercase tracking-wide text-[10px]">KVNr LE</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Kassenname</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Reason</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px]">Status</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap uppercase tracking-wide text-[10px]">Carebox Status</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 whitespace-nowrap uppercase tracking-wide text-[10px]">Audit Date</th>
              <th className="px-3 py-2.5 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {records.map((record) => (
              <tr
                key={record.id}
                className={`transition-colors duration-100 ${selectedIds.has(record.id) ? "bg-blue-50/60" : "hover:bg-slate-50"}`}
              >
                <td className="px-3 py-2.5" onClick={(e) => { e.stopPropagation(); if ((e.target as HTMLElement).tagName !== "INPUT") toggleRow(record.id); }}>
                  <input
                    type="checkbox"
                    checked={selectedIds.has(record.id)}
                    onChange={() => toggleRow(record.id)}
                    disabled={!selectedIds.has(record.id) && selectedIds.size >= MAX_SELECTION}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 disabled:opacity-40"
                    suppressHydrationWarning
                  />
                </td>
                <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap font-medium">{formatDate(record.kv_angelegt)}</td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(record.kv_entschieden)}</td>
                <td className="px-3 py-2.5 text-gray-600 font-mono whitespace-nowrap">{record.kvnr_noventi ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2.5 text-gray-600 font-mono whitespace-nowrap">{record.kvnr_le ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2.5 text-gray-700">{record.kassenname ?? <span className="text-gray-300">—</span>}</td>
                <td className="px-3 py-2.5 text-gray-500 max-w-[160px]">
                  {record.reasons ? (
                    <span className="block truncate" title={record.reasons}>{record.reasons}</span>
                  ) : <span className="text-gray-300">—</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${getStatusStyle(record.status)}`}>
                    {record.status}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  {record.carebox_status ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold whitespace-nowrap ${getStatusStyle(record.carebox_status)}`}>
                      {record.carebox_status}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDate(record.audit_date)}</td>
                <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => router.push(`/dashboard/ekv/${record.id}`)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-brand-navy-700 bg-brand-navy-50 hover:bg-brand-navy-100 active:scale-95 rounded-lg transition-all duration-100"
                    suppressHydrationWarning
                  >
                    <Eye className="w-3 h-3" />
                    View
                  </button>
                </td>
              </tr>
            ))}
            {!records.length && (
              <tr>
                <td colSpan={10} className="px-4 py-12 text-center text-gray-400 text-sm">
                  No EKV records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between text-sm text-gray-500">
        <span className="text-xs text-gray-400">Page <span className="font-medium text-gray-600">{page}</span> of <span className="font-medium text-gray-600">{totalPages}</span> &nbsp;·&nbsp; <span className="font-medium text-gray-600">{total.toLocaleString()}</span> records</span>
        {totalPages > 1 && (
          <div className="flex gap-1.5">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-100"
            >
              Previous
            </button>
            <button
              disabled={page >= totalPages}
              onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 active:scale-95 text-sm font-medium text-gray-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-100"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Export field selection modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4 animate-in slide-in-from-bottom-4 duration-200">
            <h2 className="text-base font-semibold text-gray-900 mb-1">Export CSV</h2>
            <p className="text-xs text-gray-400 mb-4">Select the fields to include in the export.</p>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {EXPORT_FIELDS.map((f) => (
                <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:text-gray-900 transition-colors">
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
                className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
              >
                Select all
              </button>
              <button
                onClick={() => setSelectedFields([])}
                className="text-xs text-gray-400 hover:text-gray-600 font-medium transition-colors"
              >
                Clear all
              </button>
            </div>
            <div className="flex gap-2">
              <button
                onClick={doExport}
                disabled={selectedFields.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 bg-brand-red-800 hover:bg-brand-red-700 active:scale-95 text-white font-medium py-2 rounded-lg text-sm transition-all duration-150 disabled:opacity-50 shadow-sm shadow-brand-red-200"
              >
                <Download className="w-4 h-4" />
                Download
              </button>
              <button
                onClick={() => setShowExportModal(false)}
                className="flex-1 border border-gray-200 text-gray-600 font-medium py-2 rounded-lg text-sm hover:bg-gray-50 active:scale-95 transition-all duration-150"
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
