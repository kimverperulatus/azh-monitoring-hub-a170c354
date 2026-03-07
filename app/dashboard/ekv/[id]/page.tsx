import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import NoteEditor from "@/components/ekv/NoteEditor";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  Pending:       "bg-yellow-100 text-yellow-700",
  Approved:      "bg-green-100 text-green-700",
  Rejected:      "bg-red-100 text-red-700",
  Error:         "bg-orange-100 text-orange-700",
  "Closed Lost": "bg-gray-100 text-gray-600",
};

function formatDate(val: string | null) {
  if (!val) return "-";
  try { return format(new Date(val), "dd.MM.yyyy"); } catch { return val; }
}

function Field({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">{label}</span>
      <span className="text-sm text-gray-800">{value || "-"}</span>
    </div>
  );
}

export default async function EkvRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("ekv_records")
    .select("*")
    .eq("id", id)
    .single();

  if (!record) notFound();

  return (
    <div className="p-6 max-w-5xl space-y-6">
      {/* Back + header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/ekv"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to EKV Records
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">EKV Record</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{record.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusStyles[record.status] ?? "bg-blue-50 text-blue-700"}`}>
          {record.status}
        </span>
      </div>

      {/* 2-column card grid */}
      <div className="grid grid-cols-2 gap-5">
        {/* Left column */}
        <div className="space-y-5">
          {/* KV Dates */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">KV Dates</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="KV Angelegt" value={formatDate(record.kv_angelegt)} />
              <Field label="KV Entschieden" value={formatDate(record.kv_entschieden)} />
            </div>
          </section>

          {/* Versicherten */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Versicherten</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Vorname" value={record.versichertenvorname} />
              <Field label="Nachname" value={record.versichertennachname} />
              <Field label="Versicherten-Nr" value={record.versicherten_nr} />
            </div>
          </section>

          {/* Status & Reasons */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Status & Reasons</h2>
            <div className="grid grid-cols-1 gap-4">
              <Field label="Status" value={record.status} />
              <Field label="Reasons" value={record.reasons} />
            </div>
          </section>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          {/* Identifiers */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Identifiers</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="KVNr NOVENTI" value={record.kvnr_noventi} />
              <Field label="KVNr LE" value={record.kvnr_le} />
              <Field label="LE - IK" value={record.le_ik} />
              <Field label="LE - KdNr" value={record.le_kdnr} />
            </div>
          </section>

          {/* Kasse */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Kasse</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Kassenname" value={record.kassenname} />
              <Field label="Kassen - IK" value={record.kassen_ik} />
            </div>
          </section>

          {/* Timestamps */}
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-sm font-semibold text-gray-700">Timestamps</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Created At" value={record.created_at ? format(new Date(record.created_at), "dd.MM.yyyy HH:mm") : null} />
              <Field label="Updated At" value={record.updated_at ? format(new Date(record.updated_at), "dd.MM.yyyy HH:mm") : null} />
            </div>
          </section>
        </div>
      </div>

      {/* Notes — full width */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Notes</h2>
        <NoteEditor recordId={record.id} initialNote={record.notes ?? null} />
      </section>
    </div>
  );
}
