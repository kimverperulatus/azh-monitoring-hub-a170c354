import { createClient, createAdminClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

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

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data: rows } = await admin.from("app_settings").select("key, value");
  const settings: Record<string, string> = {};
  for (const row of rows ?? []) settings[row.key] = row.value ?? "";

  const { zoho_client_id, zoho_client_secret, zoho_refresh_token, zoho_datacenter, zoho_module } = settings;
  const dc = zoho_datacenter || "eu";
  const module = zoho_module || "Carebox_Orders";

  if (!zoho_client_id || !zoho_client_secret || !zoho_refresh_token) {
    return NextResponse.json({ error: "Zoho credentials not configured." }, { status: 422 });
  }

  // Get access token
  const tokenHost = ZOHO_TOKEN_HOSTS[dc] ?? ZOHO_TOKEN_HOSTS.eu;
  const tokenUrl = new URL(`${tokenHost}/oauth/v2/token`);
  tokenUrl.searchParams.set("grant_type", "refresh_token");
  tokenUrl.searchParams.set("client_id", zoho_client_id);
  tokenUrl.searchParams.set("client_secret", zoho_client_secret);
  tokenUrl.searchParams.set("refresh_token", zoho_refresh_token);

  const tokenRes = await fetch(tokenUrl.toString(), { method: "POST" });
  const tokenJson = await tokenRes.json();
  if (!tokenJson.access_token) {
    return NextResponse.json({ error: `Token error: ${tokenJson.error ?? JSON.stringify(tokenJson)}` }, { status: 502 });
  }

  const apiHost = ZOHO_API_HOSTS[dc] ?? ZOHO_API_HOSTS.eu;
  const fieldsRes = await fetch(`${apiHost}/crm/v2/settings/fields?module=${module}`, {
    headers: { Authorization: `Zoho-oauthtoken ${tokenJson.access_token}` },
  });
  const fieldsJson = await fieldsRes.json();

  if (!fieldsRes.ok || !fieldsJson.fields) {
    return NextResponse.json({ error: `Zoho fields error: ${fieldsJson.message ?? JSON.stringify(fieldsJson)}` }, { status: 502 });
  }

  const fields = (fieldsJson.fields as { api_name: string; display_label: string; data_type: string }[]).map((f) => ({
    api_name: f.api_name,
    label: f.display_label,
    type: f.data_type,
  }));

  return NextResponse.json({ fields });
}
