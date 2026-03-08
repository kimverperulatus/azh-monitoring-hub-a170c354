"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function BackButton({ label, href }: { label?: string; href?: string }) {
  const router = useRouter();
  const className = "flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors";

  if (href) {
    return (
      <Link href={href} className={className}>
        <ArrowLeft className="w-4 h-4" />
        {label && <span className="hidden sm:inline">{label}</span>}
      </Link>
    );
  }

  return (
    <button onClick={() => router.back()} className={className}>
      <ArrowLeft className="w-4 h-4" />
      {label && <span className="hidden sm:inline">{label}</span>}
    </button>
  );
}
