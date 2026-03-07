import { NextRequest, NextResponse } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>;

export const maxDuration = 120;

const EXTRACTION_PROMPT = `You are analyzing a German health insurance letter/document. Extract the following fields from the PDF and return ONLY a valid JSON object with no additional text or explanation.

Fields to extract:
- category: One or more of: "Carebox", "Reusable Pads", "Invoice", "Other". If multiple apply, join them with ", " (e.g. "Carebox, Reusable Pads"). Rules in priority order: (1) If the document contains the text "Produktgruppe 54", always include "Carebox". (2) If the document is an invoice/Rechnung/bill, include "Invoice". (3) If it involves Carebox products/services, include "Carebox". (4) If it involves reusable pads/diapers/incontinence products, include "Reusable Pads". (5) If it doesn't clearly fit any of the above, use "Other". Never use null — use "Other" if truly unclear.
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

/** Clean and normalize raw PDF text for AI consumption */
function cleanPdfText(raw: string): string {
  return raw
    // Remove non-printable / control chars except newlines and tabs
    .replace(/[^\x09\x0A\x0D\x20-\x7E\u00A0-\uFFFF]/g, " ")
    // Collapse 3+ consecutive blank lines into 2
    .replace(/\n{3,}/g, "\n\n")
    // Collapse runs of spaces/tabs within a line
    .replace(/[ \t]{3,}/g, "  ")
    .trim();
}

/**
 * Smart truncation: keep first 8 000 chars + last 2 000 chars.
 * Most letter content is in the beginning; the end often has signatures / dates.
 */
function truncateText(text: string, maxChars = 10_000): string {
  if (text.length <= maxChars) return text;
  const head = text.slice(0, 8_000);
  const tail = text.slice(-2_000);
  return `${head}\n\n[... content truncated ...]\n\n${tail}`;
}

/** Try to extract valid JSON from an AI response even if it has surrounding text */
function extractJson(raw: string): Record<string, string | null> | null {
  // Strip markdown fences
  const stripped = raw.replace(/^```[a-z]*\n?/im, "").replace(/\n?```$/m, "").trim();
  // Try direct parse first
  try { return JSON.parse(stripped); } catch { /* fall through */ }
  // Try to find the first {...} block
  const match = stripped.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch { /* fall through */ }
  }
  return null;
}

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
    // Try standard parse first; fall back with max_pages option for large PDFs
    let parsed: { text: string } | null = null;
    try {
      parsed = await pdfParse(buffer);
    } catch {
      // Retry with a lenient option that skips problematic pages
      parsed = await pdfParse(buffer, { max: 50 });
    }
    const rawText = parsed?.text?.trim() ?? "";
    pdfText = truncateText(cleanPdfText(rawText));
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
    // Attempt 1: full text
    let aiResponse = await callAzure(azureUrl, apiKey, EXTRACTION_PROMPT, pdfText, 2048);
    let extracted = extractJson(aiResponse);

    // Attempt 2: if JSON extraction failed, retry with shorter text
    if (!extracted) {
      const shorterText = truncateText(pdfText, 5_000);
      aiResponse = await callAzure(azureUrl, apiKey, EXTRACTION_PROMPT, shorterText, 2048);
      extracted = extractJson(aiResponse);
    }

    if (!extracted) {
      return NextResponse.json({ error: "AI returned invalid JSON after two attempts.", raw: aiResponse }, { status: 500 });
    }

    return NextResponse.json({ ok: true, data: extracted });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const detail = `[endpoint=${endpoint} version=${apiVersion} deployment=${deployment}]`;
    return NextResponse.json({ error: `AI error: ${msg} ${detail}` }, { status: 500 });
  }
}
