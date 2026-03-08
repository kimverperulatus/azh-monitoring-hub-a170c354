import PdfUploadInline from "@/components/letter/PdfUploadInline";
import Link from "next/link";
import { List, Upload } from "lucide-react";

export default function UploadScanLettersPage() {
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
    </div>
  );
}
