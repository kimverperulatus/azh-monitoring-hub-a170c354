import PdfUploadInline from "@/components/letter/PdfUploadInline";
import UploadDateFilter from "@/components/letter/UploadDateFilter";
import Link from "next/link";
import { List, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

export default async function UploadScanLettersPage({
  searchParams,
}: {
  searchParams: Promise<{ upload_date?: string }>;
}) {
  const { upload_date } = await searchParams;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Default to today if no date selected
  const today = new Date().toISOString().slice(0, 10);
  const selectedDate = upload_date ?? today;

  let myUploadsQuery = supabase
    .from("letter_records")
    .select("id, file_name, scan_status, category, type, created_at, ai_summary")
    .eq("uploaded_by", user?.id ?? "")
    .order("created_at", { ascending: false });

  if (selectedDate) {
    myUploadsQuery = myUploadsQuery
      .gte("created_at", `${selectedDate}T00:00:00`)
      .lt("created_at", `${selectedDate}T23:59:59.999`);
  }

  const { data: myUploads } = await myUploadsQuery;

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Scan Letters</h1>
        <p className="text-sm text-gray-500">Upload one or more PDF files — AI will extract all fields automatically</p>
      </div>

      {/* Page tabs */}
      <div className="flex gap-1.5">
        <Link
          href="/dashboard/letter/all"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors"
        >
          <List className="w-4 h-4" />
          All Scan Letters
        </Link>
        <Link
          href="/dashboard/letter/upload"
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-lg bg-brand-navy-800 text-white transition-colors"
        >
          <Upload className="w-4 h-4" />
          Upload Scan Letters
        </Link>
      </div>

      <PdfUploadInline />

      {/* My Uploads Section */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-gray-800">My Uploads</h2>
          <UploadDateFilter value={selectedDate} />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">File Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Type</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">Uploaded</th>
                <th className="px-4 py-2.5" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(myUploads ?? []).map((record) => (
                <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-gray-800 font-medium truncate max-w-[180px]">{record.file_name ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{record.category ?? "-"}</td>
                  <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{record.type ?? "-"}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                      record.scan_status === "success"
                        ? "bg-green-100 text-green-700"
                        : record.scan_status === "error"
                        ? "bg-red-100 text-red-700"
                        : "bg-gray-100 text-gray-600"
                    }`}>
                      {record.scan_status ?? "unknown"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs hidden md:table-cell">
                    {record.created_at ? format(new Date(record.created_at), "HH:mm") : "-"}
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/dashboard/letter/${record.id}`}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium transition-colors"
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
              {!(myUploads ?? []).length && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No uploads on {selectedDate}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
