import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Navigate } from "react-router-dom";
import { Database, Loader2, CheckCircle, AlertCircle, ArrowDownToLine } from "lucide-react";

const ALL_TABLES = ["profiles", "ekv_records", "letter_records", "activity_logs", "role_permissions"];

export default function MigratePage() {
  const { role } = useAuth();
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<Record<string, { migrated: number; error?: string }> | null>(null);
  const [error, setError] = useState("");
  const [selectedTables, setSelectedTables] = useState<string[]>(ALL_TABLES);

  if (role !== "admin") return <Navigate to="/dashboard" replace />;

  const toggle = (t: string) => {
    setSelectedTables(prev => prev.includes(t) ? prev.filter(x => x !== t) : [...prev, t]);
  };

  const runMigration = async () => {
    setRunning(true);
    setResults(null);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("migrate-data", {
        body: { tables: selectedTables },
      });

      if (fnError) throw fnError;
      if (!data.success) throw new Error(data.error);

      setResults(data.results);
    } catch (err: any) {
      setError(err.message || "Migration failed");
    }
    setRunning(false);
  };

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-navy-100 flex items-center justify-center">
          <Database className="w-5 h-5 text-brand-navy-700" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">Data Migration</h1>
          <p className="text-sm text-muted-foreground">Pull data from your old project into Lovable Cloud</p>
        </div>
      </div>

      {/* Table selection */}
      <div className="bg-card border border-border rounded-2xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-foreground">Select tables to migrate</h2>
        <div className="space-y-2">
          {ALL_TABLES.map(t => (
            <label key={t} className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedTables.includes(t)}
                onChange={() => toggle(t)}
                className="w-4 h-4 rounded border-border text-brand-navy-600 focus:ring-brand-navy-500"
              />
              <span className="text-sm text-foreground font-medium">{t}</span>
            </label>
          ))}
        </div>

        <button
          onClick={runMigration}
          disabled={running || selectedTables.length === 0}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-navy-800 text-primary-foreground text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {running ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowDownToLine className="w-4 h-4" />}
          {running ? "Migrating..." : "Start Migration"}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-brand-red-50 border border-brand-red-200 text-brand-red-800 rounded-xl px-4 py-3 text-sm">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Results */}
      {results && (
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/50">
            <h2 className="text-sm font-semibold text-foreground">Migration Results</h2>
          </div>
          <div className="divide-y divide-border">
            {Object.entries(results).map(([table, res]) => (
              <div key={table} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-medium text-foreground">{table}</span>
                <div className="flex items-center gap-2">
                  {res.error ? (
                    <>
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <span className="text-xs text-destructive">{res.error}</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-muted-foreground">{res.migrated} rows</span>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
