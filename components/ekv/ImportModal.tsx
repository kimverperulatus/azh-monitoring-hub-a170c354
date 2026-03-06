"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, CheckCircle, AlertCircle, FileSpreadsheet } from "lucide-react";
import { parse, isValid } from "date-fns";

// Map file headers → DB columns
const HEADER_MAP: Record<string, string> = {
  "kv angelegt":        "kv_angelegt",
  "kv entschieden":     "kv_entschieden",
  "kvnr - noventi":     "kvnr_noventi",
  "kvnr noventi":       "kvnr_noventi",
  "kvnr-noventi":       "kvnr_noventi",
  "kvnr - le":          "kvnr_le",
  "kvnr le":            "kvnr_le",
  "kvnr-le":            "kvnr_le",
  "le - ik":            "le_ik",
  "le ik":              "le_ik",
  "le-ik":              "le_ik",
  "le - kdnr":          "le_kdnr",
  "le kdnr":            "le_kdnr",
  "le-kdnr":            "le_kdnr",
  "versichertenvorname":  "versichertenvorname",
  "versichertennachname": "versichertennachname",
  "versicherten-nr":    "versicherten_nr",
  "versicherten nr":    "versicherten_nr",
  "versichertennr":     "versicherten_nr",
  "kassen - ik":        "kassen_ik",
  "kassen ik":          "kassen_ik",
  "kassen-ik":          "kassen_ik",
  "kassenname":         "kassenname",
  "status":             "status",
  "reasons":            "reasons",
  "reason":             "reasons",
};

const VALID_STATUSES = new Set(["Pending", "Approved", "Rejected", "Error", "Closed Lost"]);

// Map German/alternative status values to canonical English values
const STATUS_MAP: Record<string, string> = {
  "genehmigt":    "Approved",
  "abgelehnt":    "Rejected",
  "ausstehend":   "Pending",
  "fehler":       "Error",
  "offen":        "Pending",
  "geschlossen":  "Closed Lost",
  "pending":      "Pending",
  "approved":     "Approved",
  "rejected":     "Rejected",
  "error":        "Error",
  "closed lost":  "Closed Lost",
};

const DATE_FIELDS = ["kv_angelegt", "kv_entschieden"];
function parseDate(val: string): string | null {
  if (!val || val.trim() === "") return null;
  // Try German format dd.MM.yyyy
  const german = parse(val.trim(), "dd.MM.yyyy", new Date());
  if (isValid(german)) return german.toISOString().split("T")[0];
  // Try ISO yyyy-MM-dd
  const iso = new Date(val.trim());
  if (isValid(iso)) return iso.toISOString().split("T")[0];
  return null;
}

function mapRow(rawRow: Record<string, string>): Record<string, string | null> {
  const mapped: Record<string, string | null> = {};
  for (const [rawKey, rawVal] of Object.entries(rawRow)) {
    const normalizedKey = rawKey.trim().toLowerCase();
    const dbCol = HEADER_MAP[normalizedKey];
    if (!dbCol) continue;
    const val = rawVal?.trim() ?? "";
    if (DATE_FIELDS.includes(dbCol)) {
      mapped[dbCol] = parseDate(val);
    } else if (dbCol === "status") {
      const normalized = STATUS_MAP[val.toLowerCase()] ?? (VALID_STATUSES.has(val) ? val : "Pending");
      mapped[dbCol] = normalized;
    } else {
      mapped[dbCol] = val === "" ? null : val;
    }
  }
  if (!mapped.status) mapped.status = "Pending";
  return mapped;
}

type ParsedRow = Record<string, string | null>;

export default function ImportModal() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ inserted: number; updated: number; errors: number; errorMessages: string[] } | null>(null);
  const [parseError, setParseError] = useState("");

  function reset() {
    setRows([]);
    setFileName("");
    setResult(null);
    setParseError("");
    setProgress(0);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    setOpen(false);
    reset();
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError("");
    setResult(null);

    const ext = file.name.split(".").pop()?.toLowerCase();

    if (ext === "csv") {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        delimiter: "",        // auto-detect (comma, semicolon, tab, etc.)
        encoding: "UTF-8",
        complete: (results) => {
          if (!results.data.length) {
            setParseError("CSV file is empty or could not be parsed. Check the file has a header row.");
            return;
          }
          const mapped = (results.data as Record<string, string>[]).map(mapRow);
          setRows(mapped);
        },
        error: (err) => setParseError(`Failed to parse CSV: ${err.message}`),
      });
    } else if (ext === "xlsx" || ext === "xls") {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = new Uint8Array(ev.target?.result as ArrayBuffer);
          const wb = XLSX.read(data, { type: "array", cellDates: true, cellText: false });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, {
            defval: "",
            raw: false,
            dateNF: "dd.MM.yyyy",
          });
          const mapped = raw.map((r) =>
            mapRow(Object.fromEntries(Object.entries(r).map(([k, v]) => [k, String(v ?? "")])))
          );
          setRows(mapped);
        } catch (err) {
          console.error(err);
          setParseError("Failed to parse Excel file. Please ensure it is a valid .xlsx or .xls file.");
        }
      };
      reader.onerror = () => setParseError("Could not read the file.");
      reader.readAsArrayBuffer(file);
    } else {
      setParseError("Only .csv, .xlsx, or .xls files are supported.");
    }
  }

  async function handleImport() {
    if (!rows.length) return;
    setImporting(true);
    setProgress(0);

    // Get the current user session from the SSR client
    const sessionClient = createClient();
    const { data: { session } } = await sessionClient.auth.getSession();

    // Use a direct client (no SSR lock) but inject the session token
    const supabase = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    if (session) {
      await supabase.auth.setSession(session);
    }

    let inserted = 0;
    let updated = 0;
    let errors = 0;
    const errorMessages: string[] = [];
    const batchSize = 1000;
    const concurrency = 2; // keep low to avoid connection limits

    // Separate rows with and without kvnr_noventi
    const rowsWithKey = rows.filter((r) => r.kvnr_noventi);
    const rowsWithoutKey = rows.filter((r) => !r.kvnr_noventi);

    // For rows with kvnr_noventi: fetch existing ones to count updates vs inserts
    const existingKeys = new Set<string>();
    if (rowsWithKey.length > 0) {
      const keys = rowsWithKey.map((r) => r.kvnr_noventi as string);
      const { data } = await supabase
        .from("ekv_records")
        .select("kvnr_noventi")
        .in("kvnr_noventi", keys);
      (data ?? []).forEach((r) => existingKeys.add(r.kvnr_noventi));
    }

    const allBatches: { batch: ParsedRow[]; useUpsert: boolean }[] = [];
    for (let i = 0; i < rowsWithKey.length; i += batchSize) {
      allBatches.push({ batch: rowsWithKey.slice(i, i + batchSize), useUpsert: true });
    }
    for (let i = 0; i < rowsWithoutKey.length; i += batchSize) {
      allBatches.push({ batch: rowsWithoutKey.slice(i, i + batchSize), useUpsert: false });
    }

    for (let i = 0; i < allBatches.length; i += concurrency) {
      const chunk = allBatches.slice(i, i + concurrency);

      await Promise.all(
        chunk.map(async ({ batch, useUpsert }) => {
          const query = useUpsert
            ? supabase.from("ekv_records").upsert(batch, { onConflict: "kvnr_noventi" })
            : supabase.from("ekv_records").insert(batch);

          const { error } = await query;
          if (error) {
            // Batch failed — retry row by row to skip bad rows only
            await Promise.all(
              batch.map(async (row) => {
                const rowQuery = useUpsert
                  ? supabase.from("ekv_records").upsert(row, { onConflict: "kvnr_noventi" })
                  : supabase.from("ekv_records").insert(row);
                const { error: rowError } = await rowQuery;
                if (rowError) {
                  errors++;
                  if (!errorMessages.includes(rowError.message)) {
                    errorMessages.push(rowError.message);
                  }
                } else {
                  const key = row.kvnr_noventi as string | null;
                  if (key && existingKeys.has(key)) { updated++; } else { inserted++; }
                }
              })
            );
          } else {
            batch.forEach((row) => {
              const key = row.kvnr_noventi as string | null;
              if (key && existingKeys.has(key)) { updated++; } else { inserted++; }
            });
          }
          setProgress((prev) => Math.min(prev + batch.length, rows.length));
        })
      );
    }

    setResult({ inserted, updated, errors, errorMessages });
    setImporting(false);
    router.refresh();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Upload className="w-4 h-4" />
        Import
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">Import EKV Records</h2>
              <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-5 space-y-4">
              {/* Upload area */}
              <div
                onClick={() => fileRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-8 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              >
                <FileSpreadsheet className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                {fileName ? (
                  <p className="text-sm font-medium text-blue-600">{fileName}</p>
                ) : (
                  <>
                    <p className="text-sm font-medium text-gray-600">Click to upload file</p>
                    <p className="text-xs text-gray-400 mt-1">Supports .csv, .xlsx, .xls</p>
                  </>
                )}
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFile}
                  className="hidden"
                />
              </div>

              {parseError && (
                <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{parseError}</p>
              )}

              {/* Progress bar */}
              {importing && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>Importing...</span>
                    <span>{progress} / {rows.length}</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.round((progress / rows.length) * 100)}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Preview */}
              {rows.length > 0 && !result && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{rows.length}</span> rows detected. Preview (first 3):
                  </p>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="text-xs w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          {Object.keys(rows[0]).map((k) => (
                            <th key={k} className="px-3 py-2 text-left font-medium text-gray-600 whitespace-nowrap">{k}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {rows.slice(0, 3).map((row, i) => (
                          <tr key={i}>
                            {Object.values(row).map((v, j) => (
                              <td key={j} className="px-3 py-2 text-gray-700 whitespace-nowrap">{v ?? "-"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Result */}
              {result && (
                <div className="space-y-2">
                  {result.inserted > 0 && (
                    <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      {result.inserted} new records imported
                    </div>
                  )}
                  {result.updated > 0 && (
                    <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-3 py-2 rounded-lg">
                      <CheckCircle className="w-4 h-4" />
                      {result.updated} existing records updated
                    </div>
                  )}
                  {result.errors > 0 && (
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 px-3 py-2 rounded-lg">
                        <AlertCircle className="w-4 h-4" />
                        {result.errors} records failed to import
                      </div>
                      {result.errorMessages.map((msg, i) => (
                        <p key={i} className="text-xs text-red-600 bg-red-50 px-3 py-1 rounded font-mono">
                          {msg}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Column mapping guide */}
              <details className="text-xs text-gray-400">
                <summary className="cursor-pointer hover:text-gray-600">Expected column headers</summary>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-gray-500">
                  <span>KV angelegt</span><span>KV entschieden</span>
                  <span>KVNr - NOVENTI</span><span>KVNr - LE</span>
                  <span>LE - IK</span><span>LE - KdNr</span>
                  <span>Versichertenvorname</span><span>Versichertennachname</span>
                  <span>Versicherten-Nr</span><span>Kassen - IK</span>
                  <span>Kassenname</span><span>Status</span>
                  <span>Reasons</span>
                </div>
              </details>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
              >
                {result ? "Close" : "Cancel"}
              </button>
              {!result && (
                <button
                  onClick={handleImport}
                  disabled={rows.length === 0 || importing}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50 transition-colors"
                >
                  {importing ? `Importing...` : `Import ${rows.length} rows`}
                </button>
              )}
              {result && (
                <button
                  onClick={reset}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Import another file
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
