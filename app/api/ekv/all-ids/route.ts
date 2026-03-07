import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const sp = request.nextUrl.searchParams;
  const q              = sp.get("q") ?? "";
  const status         = sp.get("status") ?? "";
  const angelegtFrom   = sp.get("angelegt_from") ?? "";
  const angelegtTo     = sp.get("angelegt_to") ?? "";
  const entschiedenFrom = sp.get("entschieden_from") ?? "";
  const entschiedenTo  = sp.get("entschieden_to") ?? "";
  const auditFilter    = sp.get("audit_filter") ?? "";
  const careboxFilter  = sp.get("carebox_filter") ?? "";

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase.from("ekv_records").select("id");

  if (status)         query = query.eq("status", status);
  if (q)              query = query.or(
    `versichertenvorname.ilike.%${q}%,versichertennachname.ilike.%${q}%,versicherten_nr.ilike.%${q}%,kvnr_noventi.ilike.%${q}%,kassenname.ilike.%${q}%,reasons.ilike.%${q}%`
  );
  if (angelegtFrom)   query = query.gte("kv_angelegt", angelegtFrom);
  if (angelegtTo)     query = query.lte("kv_angelegt", angelegtTo);
  if (entschiedenFrom) query = query.gte("kv_entschieden", entschiedenFrom);
  if (entschiedenTo)  query = query.lte("kv_entschieden", entschiedenTo);
  if (auditFilter === "not_audited") query = query.is("audit_date", null);
  if (auditFilter === "today") {
    const today = new Date().toISOString().slice(0, 10);
    query = query.gte("audit_date", `${today}T00:00:00`).lte("audit_date", `${today}T23:59:59`);
  }
  if (careboxFilter === "empty") query = query.is("carebox_status", null);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const ids = (data ?? []).map((r: { id: string }) => r.id);
  return NextResponse.json({ ids, total: ids.length });
}
