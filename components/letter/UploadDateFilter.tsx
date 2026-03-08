"use client";
import { useRouter, usePathname } from "next/navigation";

export default function UploadDateFilter({ value }: { value: string }) {
  const router = useRouter();
  const pathname = usePathname();
  return (
    <input
      type="date"
      value={value}
      onChange={(e) => {
        const params = new URLSearchParams();
        params.set("upload_date", e.target.value);
        router.push(`${pathname}?${params.toString()}`);
      }}
      className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  );
}
