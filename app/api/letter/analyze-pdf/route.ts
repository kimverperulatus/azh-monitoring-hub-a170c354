import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export const maxDuration = 60;

const EXTRACTION_PROMPT = `You are analyzing a German health insurance letter/document. Extract the following fields from the PDF and return ONLY a valid JSON object with no additional text or explanation.

Fields to extract:
- category: Must be exactly "Carebox" or "Reusable Pads". IMPORTANT: If the document contains the text "Produktgruppe 54", always use "Carebox". Otherwise, determine based on the product or service described — if the letter involves Carebox products/services, use "Carebox"; if it involves reusable pads/diapers/incontinence products, use "Reusable Pads". If unclear, use null.
- type: Must be exactly "Approved", "Reject", or "Terminations". Identify from the letter's purpose — approval/Genehmigung = "Approved", rejection/Ablehnung = "Reject", termination/Kündigung = "Terminations". If unclear, use null.
- health_insurance_provider: Name of the health insurance (Krankenkasse), e.g. "AOK Bayern", "TK", "Barmer", etc.
- date_of_letter: Date of the letter in YYYY-MM-DD format. null if not found.
- insurance_number: Patient insurance number (Versichertennummer/Mitgliedsnummer). null if not found.
- first_name: Patient first name (Vorname). null if not found.
- last_name: Patient last name (Nachname/Familienname). null if not found.
- approval_id: Approval or case reference number (Genehmigungsnummer/Aktenzeichen/Vorgangsnummer). null if not found.
- co_payment: Patient co-payment amount (Zuzahlung/Eigenanteil), including currency symbol if present. null if not found.
- insurance_covered_amount: Amount covered by insurance (Kassenleistung/Erstattungsbetrag), including currency symbol if present. null if not found.
- product_list: List of products/items mentioned in the letter. Combine into a single string. null if not found.
- valid_until: Validity date in YYYY-MM-DD format (Gültig bis/Befristung). null if not found.
- reason: Reason for approval/rejection (Begründung/Grund). null if not found.
- street: Patient street address (Straße). null if not found.
- house_number: Patient house number (Hausnummer). null if not found.
- post_code: Patient postal code (PLZ). null if not found.
- city: Patient city (Ort/Stadt). null if not found.
- ai_summary: A concise English summary (2-4 sentences) of what this letter is about — who it is for, what was approved/rejected/terminated, and any key details. Always write in English regardless of the document language.

Return ONLY a JSON object like this (no markdown, no explanation):
{"category":null,"type":null,"health_insurance_provider":null,"date_of_letter":null,"insurance_number":null,"first_name":null,"last_name":null,"approval_id":null,"co_payment":null,"insurance_covered_amount":null,"product_list":null,"valid_until":null,"reason":null,"street":null,"house_number":null,"post_code":null,"city":null,"ai_summary":null}`;

const SUMMARY_PROMPT = `You are analyzing a document. Write a concise English summary (2-4 sentences) describing what this document is about — who it is for, what it covers, and any key details. Return ONLY the summary text, no JSON, no markdown.`;

async function callAzure(url: string, apiKey: string, prompt: string, pdfText: string, maxTokens: number) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "api-key": apiKey },
    body: JSON.stringify({
      max_completion_tokens: maxTokens,
      messages: [{ role: "user", content: `${prompt}\n\n--- DOCUMENT TEXT ---\n${pdfText}` }],
    }),
  });
  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`${res.status} ${res.statusText}: ${errBody}`);
  }
  const json = await res.json() as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const summaryOnly = request.nextUrl.searchParams.get("summary_only") === "true";

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

  // Load Azure AI credentials from admin settings
  const admin = createAdminClient();
  const { data: settingsRows } = await admin
    .from("app_settings")
    .select("key, value")
    .in("key", ["azure_ai_endpoint", "azure_ai_key", "azure_ai_deployment", "azure_ai_version"]);

  const settings: Record<string, string> = {};
  for (const row of settingsRows ?? []) {
    settings[row.key] = row.value ?? "";
  }

  const endpoint = settings.azure_ai_endpoint?.trim();
  const apiKey = settings.azure_ai_key?.trim();
  const deployment = settings.azure_ai_deployment?.trim();
  const apiVersion = settings.azure_ai_version?.trim() || "2024-10-21";

  if (!endpoint || !apiKey || !deployment) {
    return NextResponse.json({ error: "Azure AI credentials are not configured. Set them in Admin → Settings." }, { status: 500 });
  }

  // Extract text from PDF
  const buffer = Buffer.from(await file.arrayBuffer());
  let pdfText: string;
  try {
    const parsed = await pdfParse(buffer);
    pdfText = parsed.text?.trim();
    if (!pdfText) {
      return NextResponse.json({ error: "Could not extract text from PDF. The file may be scanned/image-only." }, { status: 400 });
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: `Failed to parse PDF: ${msg}` }, { status: 400 });
  }

  const azureUrl = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${apiVersion}`;

  // Summary-only mode: return just a plain text summary
  if (summaryOnly) {
    try {
      const summary = await callAzure(azureUrl, apiKey, SUMMARY_PROMPT, pdfText, 512);
      return NextResponse.json({ ok: true, summary: summary.trim() });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return NextResponse.json({ error: `AI error: ${msg}` }, { status: 500 });
    }
  }

  try {
    const text = await callAzure(azureUrl, apiKey, EXTRACTION_PROMPT, pdfText, 1024);
    const cleaned = text.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/, "").trim();

    let extracted: Record<string, string | null>;
    try {
      extracted = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "AI returned invalid JSON. Try again.", raw: text }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: extracted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const detail = `[endpoint=${endpoint} version=${apiVersion} deployment=${deployment}]`;
    return NextResponse.json({ error: `AI error: ${msg} ${detail}` }, { status: 500 });
  }
}
