"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { format } from "date-fns";
import Link from "next/link";
import { Eye, Trash2, CheckCircle2, AlertCircle, Search, X, Copy, Check } from "lucide-react";
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
  "Invoice":       "bg-amber-50 text-amber-700",
  "Other":         "bg-gray-100 text-gray-600",
};

const TYPE_STYLES: Record<string, string> = {
  "Approved":     "bg-green-100 text-green-700",
  "Reject":       "bg-red-100 text-red-700",
  "Terminations": "bg-gray-100 text-gray-600",
};

const CATEGORY_OPTIONS = ["Carebox", "Reusable Pads", "Invoice", "Other"];
const TYPE_OPTIONS = ["Approved", "Reject", "Terminations"];

export default function LetterTable({
  records,
  total,
  page,
  pageSize,
  isAdmin = false,
  scanDate = "",
  scanStatus = "",
  filterCategory = "",
  filterType = "",
  filterProvider = "",
  filterSearch = "",
}: {
  records: LetterRecord[];
  total: number;
  page: number;
  pageSize: number;
  isAdmin?: boolean;
  scanDate?: string;
  scanStatus?: string;
  filterCategory?: string;
  filterType?: string;
  filterProvider?: string;
  filterSearch?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / pageSize);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [searchInput, setSearchInput] = useState(filterSearch);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copyFileName(id: string, name: string) {
    navigator.clipboard.writeText(name);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  }

  function setPage(p: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(p));
    router.push(`${pathname}?${params.toString()}`);
  }

  function applyFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value); else params.delete(key);
    params.set("page", "1");
    router.push(`${pathname}?${params.toString()}`);
  }

  function setScanToday() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    const dd = String(today.getDate()).padStart(2, "0");
    applyFilter("scan_date", `${yyyy}-${mm}-${dd}`);
  }

  function clearFilters() {
    setSearchInput("");
    router.push(pathname);
  }

  function submitSearch(val: string) {
    applyFilter("search", val);
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

  const hasFilters = !!(scanDate || scanStatus || filterCategory || filterType || filterProvider || filterSearch);

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
        {/* Row 1: Search */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search across all fields…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitSearch(searchInput)}
              className="w-full border border-gray-300 rounded-lg pl-9 pr-9 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchInput && (
              <button
                onClick={() => { setSearchInput(""); applyFilter("search", ""); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <button
            onClick={() => submitSearch(searchInput)}
            className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-700 underline transition-colors whitespace-nowrap">
              Clear all
            </button>
          )}
        </div>

        {/* Row 2: Dropdowns + date + scan status */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Category */}
          <select
            value={filterCategory}
            onChange={(e) => applyFilter("category", e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Type */}
          <select
            value={filterType}
            onChange={(e) => applyFilter("type", e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Types</option>
            {TYPE_OPTIONS.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>

          {/* Health Insurance Provider */}
          <input
            type="text"
            placeholder="Insurance provider…"
            value={filterProvider}
            onChange={(e) => applyFilter("provider", e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-44"
          />

          <div className="h-5 border-l border-gray-200" />

          {/* Scan Date */}
          <input
            type="date"
            value={scanDate}
            onChange={(e) => applyFilter("scan_date", e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={setScanToday}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${scanDate === new Date().toISOString().slice(0, 10) ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
          >
            Today
          </button>

          {/* Scan Status */}
          <div className="flex items-center gap-1">
            {(["", "success", "error"] as const).map((s) => (
              <button
                key={s}
                onClick={() => applyFilter("scan_status", s)}
                className={`px-3 py-1.5 text-sm font-medium rounded-lg border transition-colors ${scanStatus === s ? (s === "success" ? "bg-green-600 text-white border-green-600" : s === "error" ? "bg-red-600 text-white border-red-600" : "bg-gray-800 text-white border-gray-800") : "bg-white text-gray-600 border-gray-300 hover:bg-gray-50"}`}
              >
                {s === "" ? "All" : s === "success" ? "Success" : "Error"}
              </button>
            ))}
          </div>
        </div>
      </div>

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
        <table className="w-full text-xs">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {isAdmin && (
                <th className="px-2 py-2 w-7">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    className="rounded border-gray-300"
                  />
                </th>
              )}
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">Category</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">Type</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">Insurance</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">Date of Letter</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">Approval ID</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">Valid Until</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">File Name</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">Scan</th>
              <th className="text-left px-2 py-2 font-medium text-gray-600 whitespace-nowrap">AI Summary</th>
              <th className="px-2 py-2" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {records.map((record) => {
              const selected = selectedIds.has(record.id);
              return (
                <tr key={record.id} className={`hover:bg-gray-50 transition-colors ${selected ? "bg-red-50" : ""}`}>
                  {isAdmin && (
                    <td className="px-2 py-2">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleSelect(record.id)}
                        className="rounded border-gray-300"
                      />
                    </td>
                  )}
                  <td className="px-2 py-2">
                    {record.category ? (
                      <div className="flex flex-wrap gap-1">
                        {record.category.split(",").map((cat) => cat.trim()).filter(Boolean).map((cat) => (
                          <span key={cat} className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${CATEGORY_STYLES[cat] ?? "bg-gray-100 text-gray-700"}`}>
                            {cat}
                          </span>
                        ))}
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-2 py-2">
                    {record.type ? (
                      <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${TYPE_STYLES[record.type] ?? "bg-gray-100 text-gray-700"}`}>
                        {record.type}
                      </span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{record.health_insurance_provider ?? "-"}</td>
                  <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{formatDate(record.date_of_letter)}</td>
                  <td className="px-2 py-2 text-gray-600 font-mono">{record.approval_id ?? "-"}</td>
                  <td className="px-2 py-2 text-gray-700 whitespace-nowrap">{formatDate(record.valid_until)}</td>
                  <td className="px-2 py-2 max-w-[160px]">
                    {record.file_name ? (
                      <div className="flex items-center gap-1 group">
                        <span className="truncate text-gray-500" title={record.file_name}>{record.file_name}</span>
                        <button
                          onClick={() => copyFileName(record.id, record.file_name!)}
                          className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-gray-400 hover:text-gray-700"
                          title="Copy file name"
                        >
                          {copiedId === record.id
                            ? <Check className="w-3 h-3 text-green-500" />
                            : <Copy className="w-3 h-3" />}
                        </button>
                      </div>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-2 py-2">
                    {record.scan_status === "success" && (
                      <span className="flex items-center gap-1 font-medium text-green-700 whitespace-nowrap">
                        <CheckCircle2 className="w-3 h-3" /> OK
                      </span>
                    )}
                    {record.scan_status === "error" && (
                      <span className="flex items-center gap-1 font-medium text-red-600 whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" /> Err
                      </span>
                    )}
                    {!record.scan_status && <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-2 py-2 text-gray-500 max-w-[200px]">
                    {record.ai_summary ? (
                      <span className="line-clamp-2 leading-relaxed" title={record.ai_summary}>{record.ai_summary}</span>
                    ) : <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-2 py-2">
                    <Link
                      href={`/dashboard/letter/${record.id}`}
                      className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Link>
                  </td>
                </tr>
              );
            })}
            {!records.length && (
              <tr>
                <td colSpan={isAdmin ? 11 : 10} className="px-4 py-8 text-center text-gray-400">
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
