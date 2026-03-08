import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";
import LetterRecordEditor from "@/components/letter/LetterRecordEditor";
import BackButton from "@/components/ui/BackButton";
import { getUserRole } from "@/lib/auth/role";

export const dynamic = "force-dynamic";

const CATEGORY_STYLES: Record<string, string> = {
  "Carebox":       "bg-brand-navy-50 text-brand-navy-700",
  "Reusable Pads": "bg-purple-50 text-purple-700",
  "Invoice":       "bg-amber-50 text-amber-700",
  "Other":         "bg-gray-100 text-gray-600",
};
const TYPE_STYLES: Record<string, string> = {
  "Approved":     "bg-green-100 text-green-700",
  "Reject":       "bg-red-100 text-red-700",
  "Terminations": "bg-gray-100 text-gray-600",
};

export default async function LetterRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : null;

  const isScanner = role === "scanner";
  const userId = user?.id ?? "";

  const [{ data: record }, { data: prevRecord }, { data: nextRecord }] = await Promise.all([
    supabase.from("letter_records").select("*").eq("id", id).single(),
    isScanner
      ? supabase.from("letter_records").select("id").lt("id", id).eq("uploaded_by", userId).order("id", { ascending: false }).limit(1).maybeSingle()
      : supabase.from("letter_records").select("id").lt("id", id).order("id", { ascending: false }).limit(1).maybeSingle(),
    isScanner
      ? supabase.from("letter_records").select("id").gt("id", id).eq("uploaded_by", userId).order("id", { ascending: true }).limit(1).maybeSingle()
      : supabase.from("letter_records").select("id").gt("id", id).order("id", { ascending: true }).limit(1).maybeSingle(),
  ]);

  if (!record) notFound();

  return (
    <div className="p-3 md:p-6 space-y-4 w-full">
      <div className="flex items-center justify-between gap-2">
        <BackButton label="Back to Letter Records" href={isScanner ? "/dashboard/letter/upload" : undefined} />
        <div className="flex items-center gap-1.5">
          {prevRecord ? (
            <Link
              href={`/dashboard/letter/${prevRecord.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </Link>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-50 border border-gray-100 rounded-lg cursor-not-allowed">
              <ChevronLeft className="w-3.5 h-3.5" />
              Prev
            </span>
          )}
          {nextRecord ? (
            <Link
              href={`/dashboard/letter/${nextRecord.id}`}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          ) : (
            <span className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-300 bg-gray-50 border border-gray-100 rounded-lg cursor-not-allowed">
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Letter Record</h1>
          <p className="text-xs text-gray-400 font-mono mt-0.5">{record.id}</p>
        </div>
        <div className="flex items-center gap-2">
          {record.category && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_STYLES[record.category] ?? "bg-gray-100 text-gray-700"}`}>
              {record.category}
            </span>
          )}
          {record.type && (
            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[record.type] ?? "bg-gray-100 text-gray-700"}`}>
              {record.type}
            </span>
          )}
        </div>
      </div>

      <LetterRecordEditor record={record} role={role} />

      <section className="bg-white rounded-xl border border-gray-200 p-3 md:p-4 space-y-3">
        <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamps</h2>
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
