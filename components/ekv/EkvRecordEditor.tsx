"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pencil, X, Check } from "lucide-react";

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
  status: string;
  carebox_status: string | null;
  reasons: string | null;
};

const STATUS_OPTIONS = ["Pending", "Approved", "Rejected", "Error", "Closed Lost"];

const statusStyles: Record<string, string> = {
  Pending:       "bg-yellow-100 text-yellow-700",
  Approved:      "bg-green-100 text-green-700",
  Rejected:      "bg-red-100 text-red-700",
  Error:         "bg-orange-100 text-orange-700",
  "Closed Lost": "bg-gray-100 text-gray-600",
};

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value || "-"}</span>
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

export default function EkvRecordEditor({ record }: { record: EkvRecord }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    kv_angelegt:          record.kv_angelegt?.slice(0, 10) ?? "",
    kv_entschieden:       record.kv_entschieden?.slice(0, 10) ?? "",
    kvnr_noventi:         record.kvnr_noventi ?? "",
    kvnr_le:              record.kvnr_le ?? "",
    le_ik:                record.le_ik ?? "",
    le_kdnr:              record.le_kdnr ?? "",
    versichertenvorname:  record.versichertenvorname ?? "",
    versichertennachname: record.versichertennachname ?? "",
    versicherten_nr:      record.versicherten_nr ?? "",
    kassen_ik:            record.kassen_ik ?? "",
    kassenname:           record.kassenname ?? "",
    status:               record.status ?? "",
    reasons:              record.reasons ?? "",
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
    const { error: err } = await supabase.from("ekv_records").update(payload).eq("id", record.id);
    setSaving(false);
    if (err) {
      setError(err.message);
    } else {
      setEditing(false);
      router.refresh();
    }
  }

  if (!editing) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Card header */}
        <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Record Details</p>
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            Edit
          </button>
        </div>
        <div className="p-4 grid grid-cols-4 gap-x-6 gap-y-3">
          {/* Row 1: Identifiers */}
          <Field label="KVNr NOVENTI" value={record.kvnr_noventi} />
          <Field label="KVNr LE" value={record.kvnr_le} />
          <Field label="LE - IK" value={record.le_ik} />
          <Field label="LE - KdNr" value={record.le_kdnr} />
          {/* Row 2: Patient */}
          <Field label="Vorname" value={record.versichertenvorname} />
          <Field label="Nachname" value={record.versichertennachname} />
          <Field label="Versicherten-Nr" value={record.versicherten_nr} />
          <div /> {/* spacer */}
          {/* Row 3: Kasse + Dates */}
          <Field label="Kassenname" value={record.kassenname} />
          <Field label="Kassen-IK" value={record.kassen_ik} />
          <Field label="KV Angelegt" value={record.kv_angelegt?.slice(0, 10) ?? null} />
          <Field label="KV Entschieden" value={record.kv_entschieden?.slice(0, 10) ?? null} />
          {/* Row 4: Status */}
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Status</span>
            <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[record.status] ?? "bg-brand-navy-50 text-brand-navy-700"}`}>
              {record.status}
            </span>
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Carebox Status</span>
            {record.carebox_status ? (
              <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[record.carebox_status] ?? "bg-brand-navy-50 text-brand-navy-700"}`}>
                {record.carebox_status}
              </span>
            ) : (
              <span className="text-sm text-gray-400">-</span>
            )}
          </div>
          <div className="col-span-2 flex flex-col gap-0.5">
            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Reasons</span>
            <span className="text-sm text-gray-800">{record.reasons || "-"}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 bg-gray-50">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Editing Record</p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-white bg-brand-red-800 hover:bg-brand-red-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Check className="w-3 h-3" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => { setEditing(false); setError(""); }}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-3 h-3" />
            Cancel
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-red-600 bg-red-50 border-b border-red-200 px-4 py-2">{error}</p>}
      <div className="p-4 grid grid-cols-4 gap-x-4 gap-y-3">
        <InputField label="KVNr NOVENTI" name="kvnr_noventi" value={form.kvnr_noventi} onChange={handleChange} />
        <InputField label="KVNr LE" name="kvnr_le" value={form.kvnr_le} onChange={handleChange} />
        <InputField label="LE - IK" name="le_ik" value={form.le_ik} onChange={handleChange} />
        <InputField label="LE - KdNr" name="le_kdnr" value={form.le_kdnr} onChange={handleChange} />

        <InputField label="Vorname" name="versichertenvorname" value={form.versichertenvorname} onChange={handleChange} />
        <InputField label="Nachname" name="versichertennachname" value={form.versichertennachname} onChange={handleChange} />
        <InputField label="Versicherten-Nr" name="versicherten_nr" value={form.versicherten_nr} onChange={handleChange} />
        <div />

        <InputField label="Kassenname" name="kassenname" value={form.kassenname} onChange={handleChange} />
        <InputField label="Kassen-IK" name="kassen_ik" value={form.kassen_ik} onChange={handleChange} />
        <InputField label="KV Angelegt" name="kv_angelegt" value={form.kv_angelegt} onChange={handleChange} type="date" />
        <InputField label="KV Entschieden" name="kv_entschieden" value={form.kv_entschieden} onChange={handleChange} type="date" />

        <div className="flex flex-col gap-0.5">
          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Status</label>
          <select
            value={form.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>
        <div className="col-span-3 flex flex-col gap-0.5">
          <label className="text-[10px] font-medium text-gray-400 uppercase tracking-wide">Reasons</label>
          <textarea
            value={form.reasons}
            onChange={(e) => handleChange("reasons", e.target.value)}
            rows={2}
            className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>
      </div>
    </div>
  );
}
