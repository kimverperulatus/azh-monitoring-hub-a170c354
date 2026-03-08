import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Shield, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const PAGE_KEYS = [
  { key: "overview", label: "Overview" },
  { key: "ekv", label: "EKV" },
  { key: "letter_all", label: "Letters (All)" },
  { key: "letter_upload", label: "Letters (Upload)" },
  { key: "logs", label: "Activity Logs" },
];

const ROLES = ["support", "scanner", "custom"];

export default function AdminPermissionsPage() {
  const { role } = useAuth();
  const { toast } = useToast();
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetch() {
      const { data } = await supabase.from("role_permissions").select("*");
      const map: Record<string, Record<string, boolean>> = {};
      for (const r of ROLES) {
        map[r] = {};
        for (const p of PAGE_KEYS) {
          map[r][p.key] = false;
        }
      }
      for (const row of data ?? []) {
        if (map[row.role]) {
          map[row.role][row.page_key] = row.allowed;
        }
      }
      setPermissions(map);
      setLoading(false);
    }
    fetch();
  }, []);

  const toggle = (r: string, pageKey: string) => {
    setPermissions(prev => ({
      ...prev,
      [r]: { ...prev[r], [pageKey]: !prev[r][pageKey] },
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    // Delete existing and re-insert
    await supabase.from("role_permissions").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    const rows: { role: string; page_key: string; allowed: boolean }[] = [];
    for (const r of ROLES) {
      for (const p of PAGE_KEYS) {
        rows.push({ role: r, page_key: p.key, allowed: permissions[r]?.[p.key] ?? false });
      }
    }

    const { error } = await supabase.from("role_permissions").insert(rows);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Permissions saved" });
  };

  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-navy-100 flex items-center justify-center">
          <Shield className="w-5 h-5 text-brand-navy-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Permission Matrix</h1>
          <p className="text-sm text-muted-foreground">Configure page access per role (admins always have full access)</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Loading...</div>
      ) : (
        <>
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Page</th>
                    {ROLES.map(r => (
                      <th key={r} className="text-center px-4 py-3 font-semibold text-muted-foreground capitalize">{r}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {PAGE_KEYS.map(({ key, label }) => (
                    <tr key={key} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-foreground font-medium">{label}</td>
                      {ROLES.map(r => (
                        <td key={r} className="px-4 py-3 text-center">
                          <button
                            onClick={() => toggle(r, key)}
                            className={`w-8 h-8 rounded-lg border-2 transition-all duration-150 ${
                              permissions[r]?.[key]
                                ? "bg-brand-navy-800 border-brand-navy-800"
                                : "bg-card border-border hover:border-brand-navy-300"
                            }`}
                          >
                            {permissions[r]?.[key] && (
                              <svg className="w-4 h-4 mx-auto text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </button>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-5 py-2.5 bg-brand-navy-800 text-primary-foreground text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
            Save Permissions
          </button>
        </>
      )}
    </div>
  );
}
