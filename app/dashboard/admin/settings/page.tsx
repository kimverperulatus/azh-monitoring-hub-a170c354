"use client";

import { useEffect, useState } from "react";
import { Save, RefreshCw } from "lucide-react";

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

type SettingsMap = Record<string, string>;

export default function AdminSettingsPage() {
  const [values, setValues] = useState<SettingsMap>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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

  if (loading) {
    return (
      <div className="p-6 flex items-center gap-2 text-gray-500">
        <RefreshCw className="w-4 h-4 animate-spin" />
        Loading settings...
      </div>
    );
  }

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

      <section className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">How to get Zoho OAuth credentials</h2>
        <ol className="text-sm text-gray-600 space-y-1.5 list-decimal list-inside">
          <li>Go to <strong>api-console.zoho.eu</strong> (or your data center&apos;s API console)</li>
          <li>Create a <strong>Self Client</strong> application</li>
          <li>Note down the <strong>Client ID</strong> and <strong>Client Secret</strong></li>
          <li>Generate a grant code with scope: <code className="bg-gray-100 px-1 rounded text-xs">ZohoCRM.modules.ALL</code></li>
          <li>Exchange the grant code for a <strong>Refresh Token</strong> using the token endpoint</li>
          <li>Paste the Refresh Token above</li>
        </ol>
      </section>
    </div>
  );
}
