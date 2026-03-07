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
  let statusMap: Record<string, string> = {};
  if (settings.zoho_status_map) {
    try { statusMap = JSON.parse(settings.zoho_status_map); } catch { /* ignore */ }
  }

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

  // Fetch current status values for mismatch detection
  const { data: currentRecords } = await admin
    .from("ekv_records")
    .select("id, status")
    .in("id", ids);
  const currentStatusMap: Record<string, string> = {};
  for (const r of currentRecords ?? []) currentStatusMap[r.id] = r.status;

  // Update our DB records
  const results: {
    id: string;
    versicherten_nr: string | null;
    carebox_status: string | null;
    mapped_status: string | null;
    previous_status: string | null;
    status_changed: boolean;
    found: boolean;
  }[] = [];

  for (const record of records) {
    const careboxStatus = record.versicherten_nr ? (zohoData[record.versicherten_nr] ?? null) : null;
    const found = record.versicherten_nr ? (record.versicherten_nr in zohoData) : false;
    const mappedStatus = careboxStatus ? (statusMap[careboxStatus] ?? null) : null;
    const previousStatus = currentStatusMap[record.id] ?? null;
    const statusChanged = !!mappedStatus && mappedStatus !== previousStatus;

    if (found) {
      // If a mapping exists, store the mapped (local) value in carebox_status so it
      // shows the correct styled badge. Also update status. Raw Zoho value is in results.
      const careboxToStore = mappedStatus ?? careboxStatus;
      const updatePayload: Record<string, string | null> = {
        carebox_status: careboxToStore,
        audit_date: new Date().toISOString(),
      };
      if (mappedStatus) updatePayload.status = mappedStatus;
      await admin.from("ekv_records").update(updatePayload).eq("id", record.id);
    } else {
      // Still stamp audit_date even when not found in Zoho
      await admin.from("ekv_records").update({ audit_date: new Date().toISOString() }).eq("id", record.id);
    }

    results.push({
      id: record.id,
      versicherten_nr: record.versicherten_nr,
      carebox_status: careboxStatus,
      mapped_status: mappedStatus,
      previous_status: previousStatus,
      status_changed: statusChanged,
      found,
    });
  }

  const updated = results.filter((r) => r.found).length;
  const notFound = results.filter((r) => !r.found).length;
  const statusChanged = results.filter((r) => r.status_changed).length;

  return NextResponse.json({ ok: true, updated, notFound, statusChanged, results });
}

