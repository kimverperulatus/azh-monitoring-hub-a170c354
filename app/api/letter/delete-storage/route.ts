import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { record_id, pdf_url } = await request.json() as { record_id: string; pdf_url: string };
  if (!record_id || !pdf_url) return NextResponse.json({ error: "Missing params" }, { status: 400 });

  const admin = createAdminClient();

  // Extract storage path from the public URL
  const urlObj = new URL(pdf_url);
  const match = urlObj.pathname.match(/\/storage\/v1\/object\/public\/letter-pdfs\/(.+)/);
  if (match) {
    const storagePath = decodeURIComponent(match[1]);
    await admin.storage.from("letter-pdfs").remove([storagePath]);
  }

  // Clear pdf_url and stamp process_status
  const { error: dbError } = await admin
    .from("letter_records")
    .update({ pdf_url: null, process_status: "Process Completed" })
    .eq("id", record_id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
