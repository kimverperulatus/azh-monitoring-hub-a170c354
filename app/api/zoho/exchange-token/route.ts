import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const ZOHO_TOKEN_HOSTS: Record<string, string> = {
  eu: "https://accounts.zoho.eu",
  us: "https://accounts.zoho.com",
  au: "https://accounts.zoho.com.au",
  in: "https://accounts.zoho.in",
  cn: "https://accounts.zoho.com.cn",
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    client_id,
    client_secret,
    code: grant_code,
  });

  const res = await fetch(`${tokenHost}/oauth/v2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  const json = await res.json();

  if (!json.refresh_token) {
    return NextResponse.json(
      { error: `Zoho error: ${json.error ?? json.message ?? JSON.stringify(json)}` },
      { status: 502 }
    );
  }

  return NextResponse.json({ refresh_token: json.refresh_token as string });
}
