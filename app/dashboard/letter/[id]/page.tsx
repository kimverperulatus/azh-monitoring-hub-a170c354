import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { format } from "date-fns";
import LetterRecordEditor from "@/components/letter/LetterRecordEditor";

export const dynamic = "force-dynamic";

const CATEGORY_STYLES: Record<string, string> = {
  "Carebox":       "bg-blue-50 text-blue-700",
  "Reusable Pads": "bg-purple-50 text-purple-700",
};
const TYPE_STYLES: Record<string, string> = {
  "Approved":     "bg-green-100 text-green-700",
  "Reject":       "bg-red-100 text-red-700",
  "Terminations": "bg-gray-100 text-gray-600",
};

export default async function LetterRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: record } = await supabase
    .from("letter_records")
    .select("*")
    .eq("id", id)
    .single();

  if (!record) notFound();

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/letter"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Letter Records
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Letter Record</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{record.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {record.category && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${CATEGORY_STYLES[record.category] ?? "bg-gray-100 text-gray-700"}`}>
              {record.category}
            </span>
          )}
          {record.type && (
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${TYPE_STYLES[record.type] ?? "bg-gray-100 text-gray-700"}`}>
              {record.type}
            </span>
          )}
        </div>
      </div>

      <LetterRecordEditor record={record} />

      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Timestamps</h2>
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-0.5">
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">Created At</span>
            <span className="text-sm text-gray-800">
              {record.created_at ? format(new Date(record.created_at), "dd.MM.yyyy HH:mm") : "-"}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
