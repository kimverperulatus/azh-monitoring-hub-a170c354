"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Upload, X, FileText, Loader2, Check, AlertCircle } from "lucide-react";

type ExtractedData = {
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

const EMPTY: ExtractedData = {
  category: null, type: null, health_insurance_provider: null,
  date_of_letter: null, insurance_number: null, first_name: null,
  last_name: null, approval_id: null, co_payment: null,
  insurance_covered_amount: null, product_list: null, valid_until: null,
  reason: null, street: null, house_number: null, post_code: null, city: null,
};

const CATEGORY_OPTIONS = ["Carebox", "Reusable Pads"];
const TYPE_OPTIONS = ["Approved", "Reject", "Terminations"];

function Field({
  label, name, value, onChange, type = "text",
}: {
  label: string; name: string; value: string; onChange: (k: string, v: string) => void; type?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}

function SelectField({
  label, name, value, options, onChange,
}: {
  label: string; name: string; value: string; options: string[]; onChange: (k: string, v: string) => void;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(name, e.target.value)}
        className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">— select —</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function PdfUploadModal() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeError, setAnalyzeError] = useState("");
  const [extracted, setExtracted] = useState<ExtractedData | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setExtracted(null);
    setAnalyzeError("");
  }

  function handleChange(key: string, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleAnalyze() {
    if (!file) return;
    setAnalyzing(true);
    setAnalyzeError("");
    setExtracted(null);

    const fd = new FormData();
    fd.append("file", file);

    const res = await fetch("/api/letter/analyze-pdf", { method: "POST", body: fd });
    const json = await res.json();
    setAnalyzing(false);

    if (!res.ok) {
      setAnalyzeError(json.error ?? "Analysis failed.");
      return;
    }

    const data: ExtractedData = { ...EMPTY, ...json.data };
    setExtracted(data);
    // Populate form with extracted values (nulls → empty strings)
    const initial: Record<string, string> = {};
    for (const [k, v] of Object.entries(data)) {
      initial[k] = v ?? "";
    }
    setForm(initial);
  }

  async function handleSave() {
    setSaving(true);
    setSaveError("");
    const supabase = createClient();
    const payload: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(form)) {
      payload[k] = v === "" ? null : v;
    }
    const { error } = await supabase.from("letter_records").insert(payload);
    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      closeModal();
      router.refresh();
    }
  }

  function closeModal() {
    setOpen(false);
    setFile(null);
    setExtracted(null);
    setForm({});
    setAnalyzeError("");
    setSaveError("");
    if (fileRef.current) fileRef.current.value = "";
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
      >
        <Upload className="w-4 h-4" />
        Upload PDF
      </button>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center">
              <FileText className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Upload & Analyze PDF</h2>
              <p className="text-xs text-gray-400">AI extracts all letter fields automatically</p>
            </div>
          </div>
          <button onClick={closeModal} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* File picker */}
          <div className="space-y-3">
            <label
              className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl p-8 cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              <Upload className="w-8 h-8 text-gray-400" />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700">
                  {file ? file.name : "Click to select a PDF"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">PDF only · max 10 MB</p>
              </div>
              {file && (
                <span className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                  <FileText className="w-3 h-3" />
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              )}
            </label>
            <input ref={fileRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />

            <button
              onClick={handleAnalyze}
              disabled={!file || analyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
            >
              {analyzing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Analyzing PDF...</>
              ) : (
                <><FileText className="w-4 h-4" /> Analyze with AI</>
              )}
            </button>

            {analyzeError && (
              <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                {analyzeError}
              </div>
            )}
          </div>

          {/* Extracted data form */}
          {extracted && (
            <div className="space-y-5">
              <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                <Check className="w-4 h-4 shrink-0" />
                AI extracted the data below. Review and correct before saving.
              </div>

              {/* Classification */}
              <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Classification</h3>
                <div className="grid grid-cols-3 gap-3">
                  <SelectField label="Category" name="category" value={form.category ?? ""} options={CATEGORY_OPTIONS} onChange={handleChange} />
                  <SelectField label="Type" name="type" value={form.type ?? ""} options={TYPE_OPTIONS} onChange={handleChange} />
                  <Field label="Health Insurance Provider" name="health_insurance_provider" value={form.health_insurance_provider ?? ""} onChange={handleChange} />
                </div>
              </section>

              {/* Patient */}
              <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Patient</h3>
                <div className="grid grid-cols-3 gap-3">
                  <Field label="First Name" name="first_name" value={form.first_name ?? ""} onChange={handleChange} />
                  <Field label="Last Name" name="last_name" value={form.last_name ?? ""} onChange={handleChange} />
                  <Field label="Insurance Number" name="insurance_number" value={form.insurance_number ?? ""} onChange={handleChange} />
                </div>
              </section>

              {/* Address */}
              <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Address</h3>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="Street" name="street" value={form.street ?? ""} onChange={handleChange} />
                  <Field label="House No." name="house_number" value={form.house_number ?? ""} onChange={handleChange} />
                  <Field label="Post Code" name="post_code" value={form.post_code ?? ""} onChange={handleChange} />
                  <Field label="City" name="city" value={form.city ?? ""} onChange={handleChange} />
                </div>
              </section>

              {/* Insurance / Letter */}
              <section className="bg-gray-50 rounded-xl border border-gray-200 p-4 space-y-3">
                <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Letter Details</h3>
                <div className="grid grid-cols-4 gap-3">
                  <Field label="Date of Letter" name="date_of_letter" value={form.date_of_letter ?? ""} onChange={handleChange} type="date" />
                  <Field label="Valid Until" name="valid_until" value={form.valid_until ?? ""} onChange={handleChange} type="date" />
                  <Field label="Approval ID" name="approval_id" value={form.approval_id ?? ""} onChange={handleChange} />
                  <Field label="Co Payment" name="co_payment" value={form.co_payment ?? ""} onChange={handleChange} />
                  <Field label="Insurance Covered" name="insurance_covered_amount" value={form.insurance_covered_amount ?? ""} onChange={handleChange} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Product List</label>
                    <textarea
                      value={form.product_list ?? ""}
                      onChange={(e) => handleChange("product_list", e.target.value)}
                      rows={2}
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Reason</label>
                    <textarea
                      value={form.reason ?? ""}
                      onChange={(e) => handleChange("reason", e.target.value)}
                      rows={2}
                      className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                  </div>
                </div>
              </section>

              {saveError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 text-sm text-red-600">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  {saveError}
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-lg text-sm transition-colors"
                >
                  {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</> : <><Check className="w-4 h-4" /> Save Record</>}
                </button>
                <button
                  onClick={closeModal}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 font-medium rounded-lg text-sm hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
