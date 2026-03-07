import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ZOHO_TOKEN_HOSTS: Record<string, string> = {
  eu: "https://accounts.zoho.eu",
  us: "https://accounts.zoho.com",
  au: "https://accounts.zoho.com.au",
  in: "https://accounts.zoho.in",
  cn: "https://accounts.zoho.com.cn",
};

const ZOHO_API_HOSTS: Record<string, string> = {
  eu: "https://www.zohoapis.eu",
  us: "https://www.zohoapis.com",
  au: "https://www.zohoapis.com.au",
  in: "https://www.zohoapis.in",
  cn: "https://www.zohoapis.com.cn",
};

async function getAccessToken(
  clientId: string,
  clientSecret: string,
  refreshToken: string,
  datacenter: string
): Promise<string> {
  const tokenHost = ZOHO_TOKEN_HOSTS[datacenter] ?? ZOHO_TOKEN_HOSTS.eu;
  const params = new URLSearchParams({
    grant_type: "refresh_token",
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
  });
  const res = await fetch(`${tokenHost}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });
  const json = await res.json();
  if (!json.access_token) {
    throw new Error(`Zoho token error: ${json.error ?? JSON.stringify(json)}`);
  }
  return json.access_token as string;
}

export async function POST(request: NextRequest) {
  try {
    return await handleLookup(request);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Internal server error: ${msg}` }, { status: 500 });
  }
}

async function handleLookup(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { ids } = await request.json() as { ids: string[] };
  if (!ids?.length) return NextResponse.json({ error: "No record IDs provided" }, { status: 400 });

  // Load settings
  const admin = createAdminClient();
  const { data: settingsRows, error: settingsErr } = await admin.from("app_settings").select("key, value");
  if (settingsErr) {
    return NextResponse.json({ error: `Settings table error: ${settingsErr.message}. Make sure you have run the app_settings SQL migration in Supabase.` }, { status: 500 });
  }
  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) settings[row.key] = row.value ?? "";

  const clientId      = settings.zoho_client_id;
  const clientSecret  = settings.zoho_client_secret;
  const refreshToken  = settings.zoho_refresh_token;
  const datacenter    = settings.zoho_datacenter || "eu";
  const module        = settings.zoho_module || "Carebox_Orders";
  const versichertField = settings.zoho_field_versicherten_nr || "Versicherten_Nr";
  const statusField   = settings.zoho_field_status || "Carebox_Status";

  if (!clientId || !clientSecret || !refreshToken) {
    return NextResponse.json({ error: "Zoho credentials not configured. Please configure them in Settings." }, { status: 422 });
  }

  // Fetch our records
  const { data: ekvRecords, error: dbErr } = await admin
    .from("ekv_records")
    .select("id, versicherten_nr, kassen_ik")
    .in("id", ids);

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  const records = ekvRecords ?? [];
  const versichertNrs = [...new Set(records.map((r) => r.versicherten_nr).filter(Boolean))];

  if (!versichertNrs.length) {
    return NextResponse.json({ error: "Selected records have no Versicherten-Nr values." }, { status: 422 });
  }

  // Get Zoho access token
  let accessToken: string;
  try {
    accessToken = await getAccessToken(clientId, clientSecret, refreshToken, datacenter);
  } catch (e: unknown) {
    return NextResponse.json({ error: (e as Error).message }, { status: 502 });
  }

  const apiHost = ZOHO_API_HOSTS[datacenter] ?? ZOHO_API_HOSTS.eu;

  // COQL query — fetch all matching Carebox Orders in one request
  const inList = versichertNrs.map((v) => `'${v}'`).join(",");
  const coql = `SELECT ${versichertField}, ${statusField} FROM ${module} WHERE ${versichertField} in (${inList})`;

  const coqlRes = await fetch(`${apiHost}/crm/v2/coql`, {
    method: "POST",
    headers: {
      Authorization: `Zoho-oauthtoken ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ select_query: coql }),
  });

  const coqlJson = await coqlRes.json();

  if (coqlJson.code && coqlJson.code !== "SUCCESS" && !coqlRes.ok) {
    return NextResponse.json({ error: `Zoho COQL error: ${coqlJson.message ?? JSON.stringify(coqlJson)}` }, { status: 502 });
  }

  // Build a map: versicherten_nr → carebox_status
  const zohoData: Record<string, string> = {};
  for (const row of coqlJson.data ?? []) {
    const vNr = row[versichertField];
    const status = row[statusField] ?? null;
    if (vNr) zohoData[vNr] = status;
  }

  // Update our DB records
  const results: { id: string; versicherten_nr: string | null; carebox_status: string | null; found: boolean }[] = [];

  for (const record of records) {
    const status = record.versicherten_nr ? (zohoData[record.versicherten_nr] ?? null) : null;
    const found = record.versicherten_nr ? (record.versicherten_nr in zohoData) : false;

    if (found) {
      await admin
        .from("ekv_records")
        .update({ carebox_status: status })
        .eq("id", record.id);
    }

    results.push({
      id: record.id,
      versicherten_nr: record.versicherten_nr,
      carebox_status: status,
      found,
    });
  }

  const updated = results.filter((r) => r.found).length;
  const notFound = results.filter((r) => !r.found).length;

  return NextResponse.json({ ok: true, updated, notFound, results });
}

