import { createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/role";

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { ids } = await request.json() as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ error: "No IDs provided" }, { status: 400 });

  const admin = createAdminClient();

  // Fetch pdf_urls before deleting so we can clean up storage
  const { data: records } = await admin
    .from("letter_records")
    .select("id, pdf_url")
    .in("id", ids);

  // Delete PDFs from storage for any records that have one
  const storagePaths: string[] = [];
  for (const record of records ?? []) {
    if (!record.pdf_url) continue;
    try {
      const urlObj = new URL(record.pdf_url);
      const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/letter-pdfs\/(.+)/);
      if (match) storagePaths.push(decodeURIComponent(match[1]));
    } catch { /* ignore invalid URLs */ }
  }
  if (storagePaths.length) {
    await admin.storage.from("letter-pdfs").remove(storagePaths);
  }

  const { error } = await admin.from("letter_records").delete().in("id", ids);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, deleted: ids.length });
}
