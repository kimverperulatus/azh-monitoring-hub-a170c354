import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const EXTRACTION_PROMPT = `You are analyzing a German health insurance letter/document. Extract the following fields from the PDF and return ONLY a valid JSON object with no additional text or explanation.

Fields to extract:
- category: Must be exactly "Carebox" or "Reusable Pads". Determine based on the product or service described. If the letter involves Carebox products/services, use "Carebox". If it involves reusable pads/diapers/incontinence products, use "Reusable Pads". If unclear, use null.
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

Return ONLY a JSON object like this (no markdown, no explanation):
{"category":null,"type":null,"health_insurance_provider":null,"date_of_letter":null,"insurance_number":null,"first_name":null,"last_name":null,"approval_id":null,"co_payment":null,"insurance_covered_amount":null,"product_list":null,"valid_until":null,"reason":null,"street":null,"house_number":null,"post_code":null,"city":null}`;

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.type !== "application/pdf") return NextResponse.json({ error: "File must be a PDF" }, { status: 400 });
  if (file.size > 10 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 10 MB)" }, { status: 400 });

  const buffer = await file.arrayBuffer();
  const base64 = Buffer.from(buffer).toString("base64");

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json({ error: "ANTHROPIC_API_KEY is not configured" }, { status: 500 });
  }

  try {
    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64,
              },
            },
            {
              type: "text",
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const text = message.content.find((c) => c.type === "text")?.text ?? "";

    // Strip markdown code fences if present
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
    return NextResponse.json({ error: `AI error: ${msg}` }, { status: 500 });
  }
}
