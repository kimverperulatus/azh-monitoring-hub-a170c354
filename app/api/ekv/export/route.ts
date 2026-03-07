import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function applyFilters(query: any, filters: Record<string, string>) {
  const { q, kasse, status, angelegt_from, angelegt_to, entschieden_from, entschieden_to } = filters;
  if (kasse)            query = query.ilike("kassenname", `%${kasse}%`);
  if (q)                query = query.or(
    `versichertenvorname.ilike.%${q}%,versichertennachname.ilike.%${q}%,versicherten_nr.ilike.%${q}%,kvnr_noventi.ilike.%${q}%,kassenname.ilike.%${q}%,reasons.ilike.%${q}%`
  );
  if (status)           query = query.eq("status", status);
  if (angelegt_from)    query = query.gte("kv_angelegt", angelegt_from);
  if (angelegt_to)      query = query.lte("kv_angelegt", angelegt_to);
  if (entschieden_from) query = query.gte("kv_entschieden", entschieden_from);
  if (entschieden_to)   query = query.lte("kv_entschieden", entschieden_to);
  return query;
}

function escapeCSV(val: string | null | undefined): string {
  if (val == null) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const sp = request.nextUrl.searchParams;

  const filters = {
    q: sp.get("q") ?? "",
    kasse: sp.get("kasse") ?? "",
    status: sp.get("status") ?? "",
    angelegt_from: sp.get("angelegt_from") ?? "",
    angelegt_to: sp.get("angelegt_to") ?? "",
    entschieden_from: sp.get("entschieden_from") ?? "",
    entschieden_to: sp.get("entschieden_to") ?? "",
  };

  let query = supabase
    .from("ekv_records")
    .select("kv_angelegt, kv_entschieden, kvnr_noventi, kvnr_le, le_ik, le_kdnr, versichertenvorname, versichertennachname, versicherten_nr, kassen_ik, kassenname, status, reasons, notes")
    .order("kv_angelegt", { ascending: false });

  query = applyFilters(query, filters);

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = [
    "KV Angelegt", "KV Entschieden", "KVNr NOVENTI", "KVNr LE",
    "LE IK", "LE KdNr", "Vorname", "Nachname", "Versicherten-Nr",
    "Kassen IK", "Kassenname", "Status", "Reasons", "Notes",
  ];

  const rows = (data ?? []).map((r) => [
    r.kv_angelegt, r.kv_entschieden, r.kvnr_noventi, r.kvnr_le,
    r.le_ik, r.le_kdnr, r.versichertenvorname, r.versichertennachname, r.versicherten_nr,
    r.kassen_ik, r.kassenname, r.status, r.reasons, r.notes,
  ].map(escapeCSV).join(","));

  const csv = [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ekv-export.csv"`,
    },
  });
}
