"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw, KeyRound, CheckCircle, ExternalLink } from "lucide-react";

const FIELDS = [
  {
    section: "Zoho OAuth Credentials",
    items: [
      { key: "zoho_client_id",      label: "Client ID",      type: "text",     placeholder: "1000.XXXXXXXXXXXX..." },
      { key: "zoho_client_secret",  label: "Client Secret",  type: "password", placeholder: "••••••••••••••••" },
      { key: "zoho_refresh_token",  label: "Refresh Token",  type: "password", placeholder: "1000.XXXXXXXXXXXX..." },
    ],
  },
  {
    section: "Zoho Data Center",
    items: [
      { key: "zoho_datacenter", label: "Data Center", type: "select", options: ["eu", "us", "au", "in", "cn"], placeholder: "" },
    ],
  },
  {
    section: "CRM Module & Field Mapping",
    description: "Enter the exact API names of the Zoho CRM module and fields. These must match your Zoho configuration.",
    items: [
      { key: "zoho_module",                  label: "Module API Name",         type: "text", placeholder: "Carebox_Orders" },
      { key: "zoho_field_versicherten_nr",   label: "Versicherten-Nr Field",   type: "text", placeholder: "Versicherten_Nr" },
      { key: "zoho_field_status",            label: "Carebox Status Field",    type: "text", placeholder: "Carebox_Status" },
    ],
  },
];

const DC_CONSOLE_URLS: Record<string, string> = {
  eu: "https://api-console.zoho.eu",
  us: "https://api-console.zoho.com",
  au: "https://api-console.zoho.com.au",
  in: "https://api-console.zoho.in",
  cn: "https://api-console.zoho.com.cn",
};

type SettingsMap = Record<string, string>;

export default function AdminSettingsPage() {
  const [values, setValues] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Grant code exchange
  const [grantCode, setGrantCode] = useState("");
  const [exchangeLoading, setExchangeLoading] = useState(false);
  const [exchangeError, setExchangeError] = useState("");
  const [exchangeSuccess, setExchangeSuccess] = useState("");

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => r.json())
      .then((data) => {
        setValues(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load settings.");
        setLoading(false);
      });
  }, []);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");
    const res = await fetch("/api/admin/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(json.error ?? "Failed to save settings.");
    } else {
      setSuccess("Settings saved successfully.");
    }
  }

  async function handleExchangeToken() {
    setExchangeError("");
    setExchangeSuccess("");
    const clientId = values.zoho_client_id?.trim();
    const clientSecret = values.zoho_client_secret?.trim();
    const datacenter = values.zoho_datacenter || "eu";

    if (!clientId || !clientSecret) {
      setExchangeError("Fill in Client ID and Client Secret above first, then save.");
      return;
    }
    if (!grantCode.trim()) {
      setExchangeError("Paste your grant code first.");
      return;
    }

    setExchangeLoading(true);
    const res = await fetch("/api/zoho/exchange-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_code: grantCode.trim(), datacenter }),
    });
    const json = await res.json();
    setExchangeLoading(false);

    if (!res.ok) {
      const msg = json.error ?? "Token exchange failed.";
      if (msg.includes("invalid_code")) {
        setExchangeError("Grant code is invalid or already used. Grant codes are single-use and expire quickly — go back to Zoho Self Client and generate a brand new code, then paste it here immediately.");
      } else {
        setExchangeError(msg);
      }
    } else {
      const refreshToken = json.refresh_token as string;
      setValues((v) => ({ ...v, zoho_refresh_token: refreshToken }));
      setGrantCode("");
      setExchangeSuccess("Refresh token obtained and filled in above. Click Save Settings to persist it.");
    }
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading settings...
      </div>
    );
  }

  const datacenter = values.zoho_datacenter || "eu";
  const consoleUrl = DC_CONSOLE_URLS[datacenter] ?? DC_CONSOLE_URLS.eu;

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm text-gray-500 mt-0.5">Configure integrations and API credentials.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {FIELDS.map((section) => (
          <section key={section.section} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <div>
              <h2 className="text-sm font-semibold text-gray-700">{section.section}</h2>
              {section.description && (
                <p className="text-xs text-gray-400 mt-0.5">{section.description}</p>
              )}
            </div>
            <div className="space-y-3">
              {section.items.map((field) => (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{field.label}</label>
                  {field.type === "select" ? (
                    <select
                      value={values[field.key] ?? "eu"}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {field.options?.map((o) => (
                        <option key={o} value={o}>{o.toUpperCase()}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      value={values[field.key] ?? ""}
                      onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                      placeholder={field.placeholder}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                  )}
                </div>
              ))}
            </div>
          </section>
        ))}

        {error && <p className="text-sm text-red-600 bg-red-50 px-4 py-3 rounded-lg">{error}</p>}
        {success && <p className="text-sm text-green-600 bg-green-50 px-4 py-3 rounded-lg">{success}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>

      {/* Grant code exchange — no redirect URI needed */}
      <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <KeyRound className="w-4 h-4 text-gray-500" />
          <h2 className="text-sm font-semibold text-gray-700">Get Refresh Token (Self Client)</h2>
        </div>
        <p className="text-xs text-gray-500">
          No redirect URI needed. Use Zoho&apos;s Self Client to generate a one-time grant code, then exchange it here.
        </p>

        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          <li>
            Open the Zoho API Console for your data center:{" "}
            <a
              href={consoleUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-xs"
            >
              {consoleUrl} <ExternalLink className="w-3 h-3" />
            </a>
          </li>
          <li>Go to <strong>Self Client</strong> → <strong>Generate Code</strong> tab</li>
          <li>
            Set scope to:{" "}
            <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">ZohoCRM.modules.ALL</code>
          </li>
          <li>Set time duration to <strong>10 minutes</strong></li>
          <li>Click <strong>Create</strong> — copy the code <em>immediately</em></li>
          <li>Paste it below and click <strong>Exchange</strong> right away</li>
        </ol>
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <strong>Important:</strong> Grant codes are <strong>single-use and expire in 10 minutes</strong>. If you get &quot;invalid_code&quot;, generate a fresh code and try again immediately — do not reuse the same code.
        </p>

        <div className="space-y-3 pt-1">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grant Code</label>
            <input
              type="text"
              value={grantCode}
              onChange={(e) => setGrantCode(e.target.value)}
              placeholder="1000.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
            />
          </div>

          {exchangeError && (
            <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg">{exchangeError}</p>
          )}
          {exchangeSuccess && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-lg flex items-center gap-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              {exchangeSuccess}
            </p>
          )}

          <button
            type="button"
            onClick={handleExchangeToken}
            disabled={exchangeLoading || !grantCode.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-900 text-white font-medium rounded-lg text-sm transition-colors disabled:opacity-50"
          >
            {exchangeLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
            {exchangeLoading ? "Exchanging..." : "Exchange for Refresh Token"}
          </button>
        </div>
      </section>
    </div>
  );
}
