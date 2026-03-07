import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import NoteEditor from "@/components/ekv/NoteEditor";
import EkvRecordEditor from "@/components/ekv/EkvRecordEditor";

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

  const createdAt = record.created_at ? format(new Date(record.created_at), "dd.MM.yyyy HH:mm") : null;
  const updatedAt = record.updated_at ? format(new Date(record.updated_at), "dd.MM.yyyy HH:mm") : null;
  const auditDate = record.audit_date ? format(new Date(record.audit_date), "dd.MM.yyyy HH:mm") : null;

  return (
    <div className="p-3 md:p-6 space-y-4 w-full">
      {/* Back + header */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/ekv"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to EKV Records
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400 font-mono">{record.id}</span>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${statusStyles[record.status] ?? "bg-brand-navy-50 text-brand-navy-700"}`}>
            {record.status}
          </span>
        </div>
      </div>

      {/* Editable fields */}
      <EkvRecordEditor record={record} />

      {/* Timestamps + Notes side by side */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Timestamps</p>
          <div className="space-y-1.5">
            <Field label="Created At" value={createdAt} />
            <Field label="Updated At" value={updatedAt} />
            <Field label="Audit Date" value={auditDate} />
          </div>
        </div>
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-200 p-3 space-y-2">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider">Notes</p>
          <NoteEditor recordId={record.id} initialNote={record.notes ?? null} />
        </div>
      </div>
    </div>
  );
}
