"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, FileText, Loader2, CheckCircle2, AlertCircle, Play, RotateCcw } from "lucide-react";

type FileStatus = "pending" | "analyzing" | "saving" | "success" | "error";

interface FileItem {
  file: File;
  status: FileStatus;
  error?: string;
}

export default function PdfUploadInline() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

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
    const { data: { user } } = await supabase.auth.getUser();

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

      // Step 2: Upload PDF to storage
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

      // Step 3: Save to DB
      updateStatus(i, "saving");

      const payload: Record<string, string | null> = {
        file_name: file.name,
        scan_status: analyzeError ? "error" : "success",
        ...(extracted ?? {}),
        ...(fallbackSummary ? { ai_summary: fallbackSummary } : {}),
        ...(pdf_url ? { pdf_url } : {}),
        uploaded_by: user?.id ?? null,
        uploader_name: user?.email ?? null,
        uploaded_at: new Date().toISOString(),
      };

      const { data: inserted, error: dbError } = await supabase
        .from("letter_records")
        .insert(payload)
        .select("id")
        .single();

      if (dbError) {
        updateStatus(i, "error", `Save failed: ${dbError.message}`);
      } else if (analyzeError) {
        updateStatus(i, "error", analyzeError);
      } else {
        if (inserted?.id) {
          await supabase.from("activity_logs").insert({
            module: "letter",
            action: "AI PDF analyzed",
            record_id: String(inserted.id),
          });
        }
        updateStatus(i, "success");
      }
    }

    setRunning(false);
    setDone(true);
    router.refresh();
  }

  function handleReset() {
    setFiles([]);
    setDone(false);
    if (fileRef.current) fileRef.current.value = "";
  }

  const successCount = files.filter(f => f.status === "success").length;
  const errorCount = files.filter(f => f.status === "error").length;

  return (
    <div className="max-w-2xl space-y-4">
      {/* Drop zone */}
      {!running && !done && (
        <label
          className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-gray-300 rounded-2xl p-12 cursor-pointer hover:border-brand-red-400 hover:bg-red-50/30 transition-colors bg-white"
          onClick={() => fileRef.current?.click()}
        >
          <div className="w-14 h-14 rounded-2xl bg-brand-red-50 flex items-center justify-center">
            <Upload className="w-7 h-7 text-brand-red-700" />
          </div>
          <div className="text-center">
            <p className="text-base font-semibold text-gray-800">
              {files.length > 0 ? `${files.length} PDF${files.length > 1 ? "s" : ""} selected` : "Click to select PDFs"}
            </p>
            <p className="text-sm text-gray-400 mt-1">PDF only · max 10 MB each · multiple allowed</p>
          </div>
        </label>
      )}
      <input ref={fileRef} type="file" accept="application/pdf" multiple onChange={handleFileChange} className="hidden" />

      {/* File list */}
      {files.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-700">{files.length} file{files.length > 1 ? "s" : ""}</span>
            {done && (
              <span className={`text-xs font-medium ${errorCount === 0 ? "text-green-600" : "text-amber-600"}`}>
                {successCount} saved{errorCount > 0 ? `, ${errorCount} failed` : ""}
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
            {files.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-4 py-3">
                <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                <span className="flex-1 text-sm text-gray-700 truncate">{item.file.name}</span>
                <span className="text-xs text-gray-400 shrink-0">{(item.file.size / 1024).toFixed(0)} KB</span>
                <div className="shrink-0 min-w-[80px] flex justify-end">
                  {item.status === "pending" && <span className="text-xs text-gray-400">Pending</span>}
                  {item.status === "analyzing" && (
                    <span className="flex items-center gap-1 text-xs text-blue-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Analyzing…
                    </span>
                  )}
                  {item.status === "saving" && (
                    <span className="flex items-center gap-1 text-xs text-indigo-600">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving…
                    </span>
                  )}
                  {item.status === "success" && (
                    <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Saved
                    </span>
                  )}
                  {item.status === "error" && (
                    <div className="flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      {item.error && (
                        <span className="text-xs text-red-500 max-w-[160px] truncate" title={item.error}>
                          {item.error}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!done ? (
          <button
            onClick={handleRun}
            disabled={!files.length || running}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-brand-red-800 hover:bg-brand-red-700 disabled:opacity-50 text-white font-medium rounded-xl text-sm transition-colors shadow-sm"
          >
            {running ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Processing…</>
            ) : (
              <><Play className="w-4 h-4" /> Analyze & Save All</>
            )}
          </button>
        ) : (
          <button
            onClick={handleReset}
            className="flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-xl text-sm transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Upload More
          </button>
        )}
        {!running && !done && files.length > 0 && (
          <button
            onClick={handleReset}
            className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-xl text-sm hover:bg-gray-50 transition-colors"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
