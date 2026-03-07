import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ALL_FIELDS: { key: string; label: string; col: string }[] = [
  { key: "kv_angelegt",          label: "KV Angelegt",     col: "kv_angelegt" },
  { key: "kv_entschieden",       label: "KV Entschieden",  col: "kv_entschieden" },
  { key: "kvnr_noventi",         label: "KVNr NOVENTI",    col: "kvnr_noventi" },
  { key: "kvnr_le",              label: "KVNr LE",         col: "kvnr_le" },
  { key: "le_ik",                label: "LE IK",           col: "le_ik" },
  { key: "le_kdnr",              label: "LE KdNr",         col: "le_kdnr" },
  { key: "versichertenvorname",  label: "Vorname",         col: "versichertenvorname" },
  { key: "versichertennachname", label: "Nachname",        col: "versichertennachname" },
  { key: "versicherten_nr",      label: "Versicherten-Nr", col: "versicherten_nr" },
  { key: "kassen_ik",            label: "Kassen IK",       col: "kassen_ik" },
  { key: "kassenname",           label: "Kassenname",      col: "kassenname" },
  { key: "status",               label: "Status",          col: "status" },
  { key: "carebox_status",       label: "Carebox Status",  col: "carebox_status" },
  { key: "reasons",              label: "Reasons",         col: "reasons" },
  { key: "notes",                label: "Notes",           col: "notes" },
];

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

  const idsParam = sp.get("ids");
  const ids = idsParam ? idsParam.split(",").filter(Boolean) : null;

  const filters = {
    q: sp.get("q") ?? "",
    kasse: sp.get("kasse") ?? "",
    status: sp.get("status") ?? "",
    angelegt_from: sp.get("angelegt_from") ?? "",
    angelegt_to: sp.get("angelegt_to") ?? "",
    entschieden_from: sp.get("entschieden_from") ?? "",
    entschieden_to: sp.get("entschieden_to") ?? "",
  };

  // Determine which fields to include
  const fieldsParam = sp.get("fields");
  const selectedKeys = fieldsParam ? fieldsParam.split(",").filter(Boolean) : ALL_FIELDS.map((f) => f.key);
  const selectedFields = ALL_FIELDS.filter((f) => selectedKeys.includes(f.key));
  if (selectedFields.length === 0) {
    return NextResponse.json({ error: "No fields selected." }, { status: 400 });
  }

  const selectCols = selectedFields.map((f) => f.col).join(", ");
  let query = supabase
    .from("ekv_records")
    .select(selectCols)
    .order("kv_angelegt", { ascending: false });

  if (ids) {
    query = query.in("id", ids);
  } else {
    query = applyFilters(query, filters);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const headers = selectedFields.map((f) => f.label);
  const rows = (data ?? []).map((r: any) =>
    selectedFields.map((f) => escapeCSV(r[f.col])).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\r\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ekv-export.csv"`,
    },
  });
}
