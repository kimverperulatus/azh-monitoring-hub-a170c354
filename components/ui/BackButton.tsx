"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ label }: { label?: string }) {
  const router = useRouter();
  return (
    <button
      onClick={() => router.back()}
      className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
    >
      <ArrowLeft className="w-4 h-4" />
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
