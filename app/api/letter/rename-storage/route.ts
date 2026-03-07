import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { record_id, old_path, new_name } = await request.json() as {
    record_id: string;
    old_path: string;
    new_name: string;
  };
  if (!record_id || !old_path || !new_name) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  const admin = createAdminClient();

  // Move file to new name in storage
  const { error: moveError } = await admin.storage
    .from("letter-pdfs")
    .move(old_path, new_name);

  if (moveError) return NextResponse.json({ error: moveError.message }, { status: 500 });

  // Get the new public URL
  const { data: { publicUrl } } = admin.storage.from("letter-pdfs").getPublicUrl(new_name);

  // Update the record's pdf_url to reflect the new file name
  const { error: dbError } = await admin
    .from("letter_records")
    .update({ pdf_url: publicUrl })
    .eq("id", record_id);

  if (dbError) return NextResponse.json({ error: dbError.message }, { status: 500 });

  return NextResponse.json({ ok: true, pdf_url: publicUrl });
}
