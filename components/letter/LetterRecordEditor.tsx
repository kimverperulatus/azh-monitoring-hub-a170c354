"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pencil, X, Check, CheckCircle2, AlertCircle, Copy, Download } from "lucide-react";

type LetterRecord = {
  id: string;
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
  file_name: string | null;
  scan_status: string | null;
  ai_summary: string | null;
  created_at: string | null;
  pdf_url: string | null;
  process_status: string | null;
  carebox_status: string | null;
  uploader_name: string | null;
  uploaded_at: string | null;
};

const CATEGORY_OPTIONS = ["Carebox", "Reusable Pads", "Invoice", "Other"];
const TYPE_OPTIONS = ["Approved", "Reject", "Terminations"];

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value || "-"}</span>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex gap-2 py-1 border-b border-gray-50 last:border-0">
      <span className="text-[11px] text-gray-400 w-28 shrink-0 pt-px leading-tight">{label}</span>
      <span className="text-[11px] text-gray-800 flex-1 break-words leading-tight">{value || "-"}</span>
    </div>
  );
}

function InputField({
  label, name, value, onChange, type = "text",
}: {
  label: string; name: string; value: string; onChange: (name: string, val: string) => void; type?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectField({
  label, name, value, options, onChange,
}: {
  label: string; name: string; value: string; options: string[]; onChange: (name: string, val: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
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

export default function LetterRecordEditor({ record, role }: { record: LetterRecord; role?: string | null }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [copiedRenamedFile, setCopiedRenamedFile] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfLoadError, setPdfLoadError] = useState(false);
  const [processing, setProcessing] = useState(false);

  async function handleProcessToCrm() {
    if (!record.pdf_url || processing) return;
    setProcessing(true);
    try {
      // 1. Download PDF
      const res = await fetch(record.pdf_url);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = renamedFileName;
      a.click();
      URL.revokeObjectURL(a.href);

      // 2. Delete from storage and clear pdf_url in DB
      await fetch("/api/letter/delete-storage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ record_id: record.id, pdf_url: record.pdf_url }),
      });

      router.refresh();
    } catch {
      // best-effort
    } finally {
      setProcessing(false);
    }
  }

  useEffect(() => {
    if (!record.pdf_url) return;
    let objectUrl: string | null = null;
    setPdfBlobUrl(null);
    setPdfLoadError(false);
    fetch(record.pdf_url)
      .then((res) => { if (!res.ok) throw new Error(); return res.blob(); })
      .then((blob) => { objectUrl = URL.createObjectURL(blob); setPdfBlobUrl(objectUrl); })
      .catch(() => setPdfLoadError(true));
    return () => { if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [record.pdf_url]);

  const scanDate = record.created_at ? record.created_at.slice(0, 10) : "";
  const fullName = [record.first_name, record.last_name].filter(Boolean).join(" ");
  const renamedFileName = [
    scanDate,
    fullName || null,
    record.insurance_number,
    record.category,
    record.type,
  ].filter(Boolean).join("-") + ".pdf";

  function copyRenamedFileName() {
    navigator.clipboard.writeText(renamedFileName).then(() => {
      setCopiedRenamedFile(true);
      setTimeout(() => setCopiedRenamedFile(false), 2000);
    });
  }
  const [form, setForm] = useState({
    category:                   record.category ?? "",
    type:                       record.type ?? "",
    health_insurance_provider:  record.health_insurance_provider ?? "",
    date_of_letter:             record.date_of_letter ?? "",
    insurance_number:           record.insurance_number ?? "",
    first_name:                 record.first_name ?? "",
    last_name:                  record.last_name ?? "",
    approval_id:                record.approval_id ?? "",
    co_payment:                 record.co_payment ?? "",
    insurance_covered_amount:   record.insurance_covered_amount ?? "",
    product_list:               record.product_list ?? "",
    valid_until:                record.valid_until ?? "",
    reason:                     record.reason ?? "",
    street:                     record.street ?? "",
    house_number:               record.house_number ?? "",
    post_code:                  record.post_code ?? "",
    city:                       record.city ?? "",
    pdf_url:                    record.pdf_url ?? "",
    carebox_status:             record.carebox_status ?? "",
  });

  function handleChange(name: string, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSave() {
    setSaving(true);
    setError("");
    const supabase = createClient();
    const payload: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(form)) {
      payload[k] = v === "" ? null : v;
    }
    const { error: err } = await supabase.from("letter_records").update(payload).eq("id", record.id);
    if (err) {
      setSaving(false);
      setError(err.message);
      return;
    }

    // Rename the PDF in storage to match the updated record fields
    if (record.pdf_url) {
      try {
        const urlObj = new URL(record.pdf_url);
        const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/letter-pdfs\/(.+)/);
        if (match) {
          const oldPath = decodeURIComponent(match[1]);
          const newScanDate = record.created_at ? record.created_at.slice(0, 10) : "";
          const newFullName = [form.first_name, form.last_name].filter(Boolean).join(" ");
          const newFileName = [
            newScanDate,
            newFullName || null,
            form.insurance_number || null,
            form.category || null,
            form.type || null,
          ].filter(Boolean).join("-") + ".pdf";
          await fetch("/api/letter/rename-storage", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ record_id: record.id, old_path: oldPath, new_name: newFileName }),
          });
        }
      } catch {
        // rename is best-effort; don't block save
      }
    }

    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <>
        <div className="flex justify-end gap-2">
          {record.pdf_url && role !== "scanner" && (
            <button
              onClick={handleProcessToCrm}
              disabled={processing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              {processing ? "Processing..." : "Process to CRM"}
            </button>
          )}
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Record
          </button>
        </div>

        <div className="flex gap-4 items-start">
          {/* Left 70% — PDF preview */}
          <div className="flex-none sticky top-4" style={{ width: "70%" }}>
            {record.pdf_url ? (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                  <span className="text-xs font-medium text-gray-500">PDF Preview</span>
                  <a href={record.pdf_url} target="_blank" rel="noopener noreferrer"
                    className="px-2.5 py-1 text-xs font-medium text-white bg-brand-red-800 hover:bg-brand-red-700 rounded-lg transition-colors">
                    Open ↗
                  </a>
                </div>
                {pdfBlobUrl ? (
                  <iframe src={pdfBlobUrl} className="w-full" style={{ height: "calc(100vh - 140px)" }} title="PDF Preview" />
                ) : pdfLoadError ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 bg-gray-50">
                    <p className="text-xs text-gray-400">Could not load PDF preview.</p>
                    <a href={record.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Open PDF in new tab ↗</a>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-16 bg-gray-50">
                    <span className="text-xs text-gray-400">Loading PDF...</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50" style={{ height: "calc(100vh - 140px)" }}>
                <div className="text-center space-y-1">
                <p className="text-sm font-medium text-gray-400">No PDF Available</p>
                <p className="text-xs text-gray-300">Already processed or no PDF was added during upload.</p>
              </div>
              </div>
            )}
          </div>

          {/* Right 30% — compact data */}
          <div className="flex-none space-y-2" style={{ width: "30%" }}>
            {record.ai_summary && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-3">
                <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wide mb-1">AI Summary</p>
                <p className="text-xs text-blue-900 leading-relaxed">{record.ai_summary}</p>
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-0.5">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Classification</p>
              <div className="flex gap-2 py-1 border-b border-gray-50">
                <span className="text-[11px] text-gray-400 w-28 shrink-0">Category</span>
                <div className="flex flex-wrap gap-1 flex-1">
                  {record.category
                    ? record.category.split(",").map((c) => c.trim()).filter(Boolean).map((c) => (
                        <span key={c} className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_STYLES[c] ?? "bg-gray-100 text-gray-700"}`}>{c}</span>
                      ))
                    : <span className="text-[11px] text-gray-800">-</span>}
                </div>
              </div>
              <div className="flex gap-2 py-1 border-b border-gray-50">
                <span className="text-[11px] text-gray-400 w-28 shrink-0">Type</span>
                {record.type
                  ? <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${TYPE_STYLES[record.type] ?? "bg-gray-100 text-gray-700"}`}>{record.type}</span>
                  : <span className="text-[11px] text-gray-800">-</span>}
              </div>
              <Row label="Date of Letter" value={record.date_of_letter} />
              <Row label="Valid Until" value={record.valid_until} />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Patient</p>
              <Row label="First Name" value={record.first_name} />
              <Row label="Last Name" value={record.last_name} />
              <Row label="Insurance No." value={record.insurance_number} />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Address</p>
              <Row label="Street" value={record.street} />
              <Row label="House No." value={record.house_number} />
              <Row label="Post Code" value={record.post_code} />
              <Row label="City" value={record.city} />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Insurance</p>
              <Row label="Provider" value={record.health_insurance_provider} />
              <Row label="Approval ID" value={record.approval_id} />
              <Row label="Co Payment" value={record.co_payment} />
              <Row label="Covered Amount" value={record.insurance_covered_amount} />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Letter Details</p>
              <Row label="Product List" value={record.product_list} />
              <Row label="Reason" value={record.reason} />
            </div>

            <div className="bg-white rounded-lg border border-gray-200 p-3">
              <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">Scan Info</p>
              <Row label="Uploaded By" value={record.uploader_name} />
              <Row label="Upload Date" value={record.uploaded_at ? new Date(record.uploaded_at).toLocaleString() : null} />
              <Row label="File Name" value={record.file_name} />
              <div className="flex gap-2 py-1 border-b border-gray-50">
                <span className="text-[11px] text-gray-400 w-28 shrink-0 pt-px">Renamed Name</span>
                <div className="flex items-start gap-1 flex-1 min-w-0">
                  <span className="text-[11px] text-gray-800 break-all flex-1">{renamedFileName}</span>
                  <button onClick={copyRenamedFileName} className="shrink-0 p-0.5 rounded hover:bg-gray-100" title="Copy">
                    {copiedRenamedFile ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3 text-gray-400" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2 py-1 border-b border-gray-50">
                <span className="text-[11px] text-gray-400 w-28 shrink-0 pt-px">Scan Status</span>
                {record.scan_status === "success" && <span className="flex items-center gap-1 text-[11px] font-medium text-green-700"><CheckCircle2 className="w-3 h-3" /> Success</span>}
                {record.scan_status === "error" && <span className="flex items-center gap-1 text-[11px] font-medium text-red-600"><AlertCircle className="w-3 h-3" /> Error</span>}
                {!record.scan_status && <span className="text-[11px] text-gray-800">-</span>}
              </div>
              <div className="flex gap-2 py-1 border-b border-gray-50">
                <span className="text-[11px] text-gray-400 w-28 shrink-0 pt-px">Process Status</span>
                {record.process_status === "Process Completed"
                  ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">Process Completed</span>
                  : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-700">{record.process_status ?? "Not Yet Processed"}</span>}
              </div>
              <div className="flex gap-2 py-1">
                <span className="text-[11px] text-gray-400 w-28 shrink-0 pt-px">Carebox Status</span>
                <span className="text-[11px] text-gray-800 flex-1">{record.carebox_status || "-"}</span>
              </div>
            </div>
          </div>
        </div>
      </>
    );
  }

  const cx = "w-full border border-gray-300 rounded px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-500";

  return (
    <>
      <div className="flex justify-end gap-2">
        <button onClick={handleSave} disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-brand-red-800 hover:bg-brand-red-700 disabled:opacity-50 rounded-lg transition-colors">
          <Check className="w-3.5 h-3.5" />
          {saving ? "Saving..." : "Save"}
        </button>
        <button onClick={() => { setEditing(false); setError(""); }}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
          <X className="w-3.5 h-3.5" />
          Cancel
        </button>
      </div>

      {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="flex gap-4 items-start">
        {/* Left 70% — PDF preview */}
        <div className="flex-none sticky top-4" style={{ width: "70%" }}>
          {record.pdf_url ? (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 border-b border-gray-100">
                <span className="text-xs font-medium text-gray-500">PDF Preview</span>
                <a href={record.pdf_url} target="_blank" rel="noopener noreferrer"
                  className="px-2.5 py-1 text-xs font-medium text-white bg-brand-red-800 hover:bg-brand-red-700 rounded-lg transition-colors">
                  Open ↗
                </a>
              </div>
              {pdfBlobUrl ? (
                <iframe src={pdfBlobUrl} className="w-full" style={{ height: "calc(100vh - 140px)" }} title="PDF Preview" />
              ) : pdfLoadError ? (
                <div className="flex flex-col items-center justify-center gap-2 py-16 bg-gray-50">
                  <p className="text-xs text-gray-400">Could not load PDF preview.</p>
                  <a href={record.pdf_url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline">Open PDF in new tab ↗</a>
                </div>
              ) : (
                <div className="flex items-center justify-center py-16 bg-gray-50">
                  <span className="text-xs text-gray-400">Loading PDF...</span>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center rounded-xl border border-dashed border-gray-200 bg-gray-50" style={{ height: "calc(100vh - 140px)" }}>
              <div className="text-center space-y-1">
                <p className="text-sm font-medium text-gray-400">No PDF Available</p>
                <p className="text-xs text-gray-300">Already processed or no PDF was added during upload.</p>
              </div>
            </div>
          )}
        </div>

        {/* Right 30% — compact edit form */}
        <div className="flex-none space-y-2" style={{ width: "30%" }}>
          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Classification</p>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Category</label>
              <div className="flex flex-wrap gap-1.5">
                {CATEGORY_OPTIONS.map((opt) => {
                  const selected = form.category.split(",").map((c) => c.trim()).includes(opt);
                  return (
                    <label key={opt} className="flex items-center gap-1 cursor-pointer">
                      <input type="checkbox" checked={selected} onChange={() => {
                        const current = form.category.split(",").map((c) => c.trim()).filter(Boolean);
                        const next = selected ? current.filter((c) => c !== opt) : [...current, opt];
                        handleChange("category", next.join(", "));
                      }} className="rounded border-gray-300 w-3 h-3" />
                      <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${CATEGORY_STYLES[opt] ?? "bg-gray-100 text-gray-700"}`}>{opt}</span>
                    </label>
                  );
                })}
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Type</label>
              <select value={form.type} onChange={(e) => handleChange("type", e.target.value)} className={cx}>
                <option value="">— select —</option>
                {TYPE_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Date of Letter</label>
                <input type="date" value={form.date_of_letter} onChange={(e) => handleChange("date_of_letter", e.target.value)} className={cx} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Valid Until</label>
                <input type="date" value={form.valid_until} onChange={(e) => handleChange("valid_until", e.target.value)} className={cx} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Patient</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">First Name</label>
                <input value={form.first_name} onChange={(e) => handleChange("first_name", e.target.value)} className={cx} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Last Name</label>
                <input value={form.last_name} onChange={(e) => handleChange("last_name", e.target.value)} className={cx} />
              </div>
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Insurance Number</label>
              <input value={form.insurance_number} onChange={(e) => handleChange("insurance_number", e.target.value)} className={cx} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Address</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Street</label>
                <input value={form.street} onChange={(e) => handleChange("street", e.target.value)} className={cx} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">House No.</label>
                <input value={form.house_number} onChange={(e) => handleChange("house_number", e.target.value)} className={cx} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Post Code</label>
                <input value={form.post_code} onChange={(e) => handleChange("post_code", e.target.value)} className={cx} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">City</label>
                <input value={form.city} onChange={(e) => handleChange("city", e.target.value)} className={cx} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Insurance</p>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Provider</label>
              <input value={form.health_insurance_provider} onChange={(e) => handleChange("health_insurance_provider", e.target.value)} className={cx} />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Approval ID</label>
              <input value={form.approval_id} onChange={(e) => handleChange("approval_id", e.target.value)} className={cx} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Co Payment</label>
                <input value={form.co_payment} onChange={(e) => handleChange("co_payment", e.target.value)} className={cx} />
              </div>
              <div className="flex flex-col gap-0.5">
                <label className="text-[10px] text-gray-400 uppercase tracking-wide">Covered Amount</label>
                <input value={form.insurance_covered_amount} onChange={(e) => handleChange("insurance_covered_amount", e.target.value)} className={cx} />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Letter Details</p>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Product List</label>
              <textarea value={form.product_list} onChange={(e) => handleChange("product_list", e.target.value)} rows={2} className={`${cx} resize-none`} />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] text-gray-400 uppercase tracking-wide">Reason</label>
              <textarea value={form.reason} onChange={(e) => handleChange("reason", e.target.value)} rows={2} className={`${cx} resize-none`} />
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-3 space-y-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">PDF Link</p>
            <input value={form.pdf_url} onChange={(e) => handleChange("pdf_url", e.target.value)} className={cx} placeholder="https://..." />
          </div>
        </div>
      </div>
    </>
  );
}
