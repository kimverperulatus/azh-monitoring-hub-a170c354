import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/role";

const ZOHO_TOKEN_HOSTS: Record<string, string> = {
  eu: "https://accounts.zoho.eu",
  us: "https://accounts.zoho.com",
  au: "https://accounts.zoho.com.au",
  in: "https://accounts.zoho.in",
  cn: "https://accounts.zoho.com.cn",
};

export async function POST(request: NextRequest) {
  const denied = await requireAdmin();
  if (denied) return denied;

  const { client_id, client_secret, grant_code, datacenter } = await request.json() as {
    client_id: string;
    client_secret: string;
    grant_code: string;
    datacenter: string;
  };

  if (!client_id || !client_secret || !grant_code) {
    return NextResponse.json({ error: "client_id, client_secret and grant_code are required." }, { status: 400 });
  }

  const tokenHost = ZOHO_TOKEN_HOSTS[datacenter] ?? ZOHO_TOKEN_HOSTS.eu;

  // Zoho Self Client: send params as URL query string (as documented by Zoho)
  const url = new URL(`${tokenHost}/oauth/v2/token`);
  url.searchParams.set("grant_type", "authorization_code");
  url.searchParams.set("client_id", client_id);
  url.searchParams.set("client_secret", client_secret);
  url.searchParams.set("code", grant_code);

  const res = await fetch(url.toString(), { method: "POST" });
  const json = await res.json();

  if (!json.refresh_token) {
    // Return the full Zoho response so it's easier to debug
    return NextResponse.json(
      { error: `Zoho error: ${json.error ?? json.message ?? JSON.stringify(json)}`, zoho_response: json },
      { status: 502 }
    );
  }

  return NextResponse.json({ refresh_token: json.refresh_token as string });
}
