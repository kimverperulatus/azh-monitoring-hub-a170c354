"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Pencil, X, Check, CheckCircle2, AlertCircle } from "lucide-react";

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
};

const CATEGORY_OPTIONS = ["Carebox", "Reusable Pads"];
const TYPE_OPTIONS = ["Approved", "Reject", "Terminations"];

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
};
const TYPE_STYLES: Record<string, string> = {
  "Approved":     "bg-green-100 text-green-700",
  "Reject":       "bg-red-100 text-red-700",
  "Terminations": "bg-gray-100 text-gray-600",
};

export default function LetterRecordEditor({ record }: { record: LetterRecord }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
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
      <>
        <div className="flex justify-end">
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" />
            Edit Record
          </button>
        </div>

        <div className="grid grid-cols-2 gap-5">
          <div className="space-y-5">
            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Classification</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Category</span>
                  {record.category ? (
                    <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[record.category] ?? "bg-gray-100 text-gray-700"}`}>
                      {record.category}
                    </span>
                  ) : <span className="text-sm text-gray-800">-</span>}
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Type</span>
                  {record.type ? (
                    <span className={`self-start px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[record.type] ?? "bg-gray-100 text-gray-700"}`}>
                      {record.type}
                    </span>
                  ) : <span className="text-sm text-gray-800">-</span>}
                </div>
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Patient</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="First Name" value={record.first_name} />
                <Field label="Last Name" value={record.last_name} />
                <Field label="Insurance Number" value={record.insurance_number} />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Address</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Street" value={record.street} />
                <Field label="House Number" value={record.house_number} />
                <Field label="Post Code" value={record.post_code} />
                <Field label="City" value={record.city} />
              </div>
            </section>
          </div>

          <div className="space-y-5">
            {record.ai_summary && (
              <section className="bg-blue-50 rounded-xl border border-blue-200 p-5 space-y-2">
                <h2 className="text-sm font-semibold text-blue-700">AI Summary</h2>
                <p className="text-sm text-blue-900 leading-relaxed">{record.ai_summary}</p>
              </section>
            )}
            {(record.file_name || record.scan_status) && (
              <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
                <h2 className="text-sm font-semibold text-gray-700">Scan Info</h2>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="File Name" value={record.file_name} />
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Scan Status</span>
                    {record.scan_status === "success" && (
                      <span className="flex items-center gap-1 text-sm font-medium text-green-700">
                        <CheckCircle2 className="w-4 h-4" /> Success
                      </span>
                    )}
                    {record.scan_status === "error" && (
                      <span className="flex items-center gap-1 text-sm font-medium text-red-600">
                        <AlertCircle className="w-4 h-4" /> Error
                      </span>
                    )}
                    {!record.scan_status && <span className="text-sm text-gray-800">-</span>}
                  </div>
                </div>
              </section>
            )}
            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Insurance</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Health Insurance Provider" value={record.health_insurance_provider} />
                <Field label="Approval ID" value={record.approval_id} />
                <Field label="Co Payment" value={record.co_payment} />
                <Field label="Insurance Covered Amount" value={record.insurance_covered_amount} />
              </div>
            </section>

            <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-700">Letter Details</h2>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Date of Letter" value={record.date_of_letter} />
                <Field label="Valid Until" value={record.valid_until} />
              </div>
              <Field label="Product List" value={record.product_list} />
              <Field label="Reason" value={record.reason} />
            </section>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">Editing record — make changes and save.</p>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            {saving ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => { setEditing(false); setError(""); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Cancel
          </button>
        </div>
      </div>

      {error && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}

      <div className="grid grid-cols-2 gap-5">
        <div className="space-y-5">
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Classification</h2>
            <div className="grid grid-cols-2 gap-4">
              <SelectField label="Category" name="category" value={form.category} options={CATEGORY_OPTIONS} onChange={handleChange} />
              <SelectField label="Type" name="type" value={form.type} options={TYPE_OPTIONS} onChange={handleChange} />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Patient</h2>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="First Name" name="first_name" value={form.first_name} onChange={handleChange} />
              <InputField label="Last Name" name="last_name" value={form.last_name} onChange={handleChange} />
              <InputField label="Insurance Number" name="insurance_number" value={form.insurance_number} onChange={handleChange} />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Address</h2>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Street" name="street" value={form.street} onChange={handleChange} />
              <InputField label="House Number" name="house_number" value={form.house_number} onChange={handleChange} />
              <InputField label="Post Code" name="post_code" value={form.post_code} onChange={handleChange} />
              <InputField label="City" name="city" value={form.city} onChange={handleChange} />
            </div>
          </section>
        </div>

        <div className="space-y-5">
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Insurance</h2>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Health Insurance Provider" name="health_insurance_provider" value={form.health_insurance_provider} onChange={handleChange} />
              <InputField label="Approval ID" name="approval_id" value={form.approval_id} onChange={handleChange} />
              <InputField label="Co Payment" name="co_payment" value={form.co_payment} onChange={handleChange} />
              <InputField label="Insurance Covered Amount" name="insurance_covered_amount" value={form.insurance_covered_amount} onChange={handleChange} />
            </div>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Letter Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <InputField label="Date of Letter" name="date_of_letter" value={form.date_of_letter} onChange={handleChange} type="date" />
              <InputField label="Valid Until" name="valid_until" value={form.valid_until} onChange={handleChange} type="date" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Product List</label>
              <textarea
                value={form.product_list}
                onChange={(e) => handleChange("product_list", e.target.value)}
                rows={3}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">Reason</label>
              <textarea
                value={form.reason}
                onChange={(e) => handleChange("reason", e.target.value)}
                rows={3}
                className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              />
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
