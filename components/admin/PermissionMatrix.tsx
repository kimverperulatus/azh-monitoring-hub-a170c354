"use client";

import { useState } from "react";
import { RefreshCw, Check } from "lucide-react";

type Permission = { id?: string; role: string; page_key: string; enabled: boolean };

const ROLES = ["support", "scanner", "custom"];
const PAGES = [
  { key: "overview",      label: "Overview" },
  { key: "ekv",           label: "EKV" },
  { key: "letter_all",    label: "All Scan Letters" },
  { key: "letter_upload", label: "Upload Scan Letters" },
  { key: "logs",          label: "Logs" },
];

const ROLE_STYLES: Record<string, string> = {
  support: "text-blue-700",
  scanner: "text-purple-700",
  custom:  "text-amber-700",
};

export default function PermissionMatrix({ initialPermissions }: { initialPermissions: Permission[] }) {
  const [perms, setPerms] = useState<Permission[]>(initialPermissions);
  const [saving, setSaving] = useState<string | null>(null);
  const [savedKey, setSavedKey] = useState<string | null>(null);

  function getEnabled(role: string, page_key: string): boolean {
    return perms.find((p) => p.role === role && p.page_key === page_key)?.enabled ?? false;
  }

  async function toggle(role: string, page_key: string) {
    const current = getEnabled(role, page_key);
    const key = `${role}:${page_key}`;
    setSaving(key);

    const res = await fetch("/api/admin/permissions", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role, page_key, enabled: !current }),
    });

    setSaving(null);
    if (res.ok) {
      setPerms((prev) => {
        const exists = prev.find((p) => p.role === role && p.page_key === page_key);
        if (exists) {
          return prev.map((p) => p.role === role && p.page_key === page_key ? { ...p, enabled: !current } : p);
        }
        return [...prev, { role, page_key, enabled: !current }];
      });
      setSavedKey(key);
      setTimeout(() => setSavedKey(null), 1500);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-gray-50 border-b border-gray-200">
          <tr>
            <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Page</th>
            {ROLES.map((role) => (
              <th key={role} className={`text-center px-4 py-3 text-xs font-semibold uppercase tracking-wide ${ROLE_STYLES[role]}`}>
                {role.charAt(0).toUpperCase() + role.slice(1)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {PAGES.map((page) => (
            <tr key={page.key} className="hover:bg-gray-50 transition-colors">
              <td className="px-4 py-3 font-medium text-gray-700">{page.label}</td>
              {ROLES.map((role) => {
                const key = `${role}:${page.key}`;
                const enabled = getEnabled(role, page.key);
                const isSaving = saving === key;
                const isSaved = savedKey === key;
                return (
                  <td key={role} className="px-4 py-3 text-center">
                    <button
                      onClick={() => toggle(role, page.key)}
                      disabled={isSaving}
                      className={`relative w-10 h-6 rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500 ${
                        enabled ? "bg-green-500" : "bg-gray-200"
                      } disabled:opacity-60`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 flex items-center justify-center ${
                        enabled ? "translate-x-4" : "translate-x-0"
                      }`}>
                        {isSaving && <RefreshCw className="w-2.5 h-2.5 text-gray-400 animate-spin" />}
                        {isSaved && !isSaving && <Check className="w-2.5 h-2.5 text-green-500" />}
                      </span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="px-4 py-3 border-t border-gray-100 bg-gray-50">
        <p className="text-xs text-gray-400">Note: Admin role always has access to all pages and cannot be restricted.</p>
      </div>
    </div>
  );
}
