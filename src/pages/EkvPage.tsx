import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Search, Upload } from "lucide-react";
import { useNavigate } from "react-router-dom";
import CsvImportDialog from "@/components/CsvImportDialog";

export default function EkvPage() {
  const [records, setRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [importOpen, setImportOpen] = useState(false);
  const navigate = useNavigate();

  const fetchRecords = async () => {
    setLoading(true);
    let query = supabase.from("ekv_records").select("*").order("created_at", { ascending: false });
    if (statusFilter !== "all") query = query.eq("status", statusFilter);
    const { data } = await query;
    setRecords(data ?? []);
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [statusFilter]);

  const filtered = records.filter((r) => {
    if (!search) return true;
    const payload = JSON.stringify(r.payload ?? {}).toLowerCase();
    return payload.includes(search.toLowerCase()) || r.status.includes(search.toLowerCase());
  });

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground tracking-tight">EKV Records</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage EKV application records</p>
        </div>
        <button
          onClick={() => setImportOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-brand-navy-800 text-primary-foreground text-sm font-medium rounded-xl hover:bg-brand-navy-700 transition-colors shadow-sm"
        >
          <Upload className="w-4 h-4" />
          Import CSV
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search records..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-card border border-border rounded-xl pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-navy-500"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-card border border-border rounded-xl px-4 py-2.5 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-navy-500"
        >
          <option value="all">All Status</option>
          <option value="pending">Pending</option>
          <option value="success">Success</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="bg-card border border-border rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/50">
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">ID</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Payload</th>
                <th className="text-left px-4 py-3 font-semibold text-muted-foreground">Created</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">Loading...</td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No records found</td></tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} onClick={() => navigate(`/dashboard/ekv/${r.id}`)} className="hover:bg-muted/30 transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{r.id.slice(0, 8)}...</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex px-2 py-0.5 rounded-md text-xs font-medium ${
                        r.status === "success" ? "bg-green-100 text-green-800" :
                        r.status === "pending" ? "bg-brand-gold-100 text-brand-gold-800" :
                        "bg-brand-red-100 text-brand-red-800"
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-xs truncate">{JSON.stringify(r.payload)}</td>
                    <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{new Date(r.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <CsvImportDialog open={importOpen} onClose={() => setImportOpen(false)} onImported={() => { setImportOpen(false); fetchRecords(); }} />
    </div>
  );
}
