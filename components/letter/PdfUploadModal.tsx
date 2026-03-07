"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, FileText, Loader2, CheckCircle2, AlertCircle, Play } from "lucide-react";

type FileStatus = "pending" | "analyzing" | "saving" | "success" | "error";

interface FileItem {
  file: File;
  status: FileStatus;
  error?: string;
}

export default function PdfUploadModal() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileItem[]>([]);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []).filter(f => f.type === "application/pdf");
    setFiles(selected.map(file => ({ file, status: "pending" })));
    setDone(false);
  }

  function updateStatus(index: number, status: FileStatus, error?: string) {
    setFiles(prev => prev.map((item, i) => i === index ? { ...item, status, error } : item));
  }

  async function handleRun() {
    if (!files.length || running) return;
    setRunning(true);
    setDone(false);

    const supabase = createClient();

    for (let i = 0; i < files.length; i++) {
      const { file } = files[i];
      updateStatus(i, "analyzing");

      // Step 1: Analyze PDF
      const fd = new FormData();
      fd.append("file", file);

      let extracted: Record<string, string | null> | null = null;
      let analyzeError: string | null = null;

      try {
        const res = await fetch("/api/letter/analyze-pdf", { method: "POST", body: fd });
        const json = await res.json();
        if (!res.ok) {
          analyzeError = json.error ?? "Analysis failed.";
        } else {
          extracted = json.data;
        }
      } catch {
        analyzeError = "Network error during analysis.";
      }

      // Fallback: if full extraction failed, try to get just a summary
      let fallbackSummary: string | null = null;
      if (analyzeError) {
        try {
          const fd2 = new FormData();
          fd2.append("file", file);
          const res2 = await fetch("/api/letter/analyze-pdf?summary_only=true", { method: "POST", body: fd2 });
          if (res2.ok) {
            const json2 = await res2.json();
            fallbackSummary = json2.summary ?? null;
          }
        } catch {
          // ignore — summary is best-effort
        }
      }

      // Step 2: Upload PDF to storage via server route (uses admin client to bypass RLS)
      let pdf_url: string | null = null;
      try {
        const fd3 = new FormData();
        fd3.append("file", file);
        const res3 = await fetch("/api/letter/upload-storage", { method: "POST", body: fd3 });
        if (res3.ok) {
          const json3 = await res3.json();
          pdf_url = json3.pdf_url ?? null;
        }
      } catch {
        // storage upload is best-effort; continue without it
      }

      // Step 3: Save to DB (success or error record)
      updateStatus(i, "saving");

      const payload: Record<string, string | null> = {
        file_name: file.name,
        scan_status: analyzeError ? "error" : "success",
        ...(extracted ?? {}),
        ...(fallbackSummary ? { ai_summary: fallbackSummary } : {}),
        ...(pdf_url ? { pdf_url } : {}),
      };

      const { error: dbError } = await supabase.from("letter_records").insert(payload);

      if (dbError) {
        updateStatus(i, "error", `Saved failed: ${dbError.message}`);
      } else if (analyzeError) {
        updateStatus(i, "error", analyzeError);
      } else {
        updateStatus(i, "success");
      }
    }

    setRunning(false);
    setDone(true);
    router.refresh();
  }

  function closeModal() {
    setOpen(false);
    setFiles([]);
    setDone(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const successCount = files.filter(f => f.status === "success").length;
  const errorCount = files.filter(f => f.status === "error").length;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-brand-red-800 hover:bg-brand-red-700 rounded-lg transition-colors"
      >
        <Upload className="w-4 h-4" />
        Upload PDF
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Upload & Analyze PDFs</h2>
              <p className="text-xs text-gray-400">AI extracts all fields and saves automatically</p>
            </div>
          </div>
          <button onClick={closeModal} disabled={running} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-40">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* File picker */}
          {!running && !done && (
            <label
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {files.length > 0 ? `${files.length} PDF${files.length > 1 ? "s" : ""} selected` : "Click to select PDFs"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">PDF only · max 10 MB each · multiple allowed</p>
              </div>
            </label>
          )}
          <input ref={fileRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} className="hidden" />

          {/* File list */}
          {files.length > 0 && (
            <div className="space-y-1.5 max-h-72 overflow-y-auto">
              {files.map((item, i) => (
                <div key={i} className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-lg border border-gray-200">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <span className="flex-1 text-sm text-gray-700 truncate">{item.file.name}</span>
                  <span className="text-xs text-gray-400 shrink-0">{(item.file.size / 1024).toFixed(0)} KB</span>
                  <div className="shrink-0">
                    {item.status === "pending" && <span className="text-xs text-gray-400">Pending</span>}
                    {item.status === "analyzing" && <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />}
                    {item.status === "saving" && <Loader2 className="w-4 h-4 text-indigo-500 animate-spin" />}
                    {item.status === "success" && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                    {item.status === "error" && (
                      <div className="flex items-center gap-1.5">
                        <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                        {item.error && <span className="text-xs text-red-500 max-w-[180px] truncate" title={item.error}>{item.error}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Summary after done */}
          {done && (
            <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${errorCount === 0 ? "bg-green-50 text-green-700 border border-green-200" : "bg-amber-50 text-amber-700 border border-amber-200"}`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {successCount} saved successfully{errorCount > 0 ? `, ${errorCount} failed (saved with error status)` : ""}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            {!done ? (
              <button
                onClick={handleRun}
                disabled={!files.length || running}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-red-800 hover:bg-brand-red-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
              >
                {running ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Processing {files.filter(f => f.status === "analyzing" || f.status === "saving").map((_, i) => i + 1)[0] ?? ""}...</>
                ) : (
                  <><Play className="w-4 h-4" /> Analyze & Save All</>
                )}
              </button>
            ) : (
              <button
                onClick={closeModal}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg text-sm transition-colors"
              >
                Done
              </button>
            )}
            {!running && !done && (
              <button
                onClick={closeModal}
                className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
