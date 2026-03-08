import PdfUploadInline from "@/components/letter/PdfUploadInline";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function UploadScanLettersPage() {
  return (
    <div className="p-3 md:p-6 space-y-6">
      <div>
        <Link
          href="/dashboard/letter/all"
          className="inline-flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 mb-3 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to All Scan Letters
        </Link>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Upload Scan Letters</h1>
        <p className="text-sm text-gray-500">Upload one or more PDF files — AI will extract all fields automatically</p>
      </div>
      <PdfUploadInline />
    </div>
  );
}
