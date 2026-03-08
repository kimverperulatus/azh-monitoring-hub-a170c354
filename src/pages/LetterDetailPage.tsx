import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, FileText, ExternalLink, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LetterDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allIds, setAllIds] = useState<string[]>([]);
  const [form, setForm] = useState({
    recipient: "",
    category: "",
    type: "",
    status: "pending",
    scan_status: "",
    process_status: "",
    date_of_letter: "",
  });

  useEffect(() => {
    supabase.from("letter_records").select("id").order("created_at", { ascending: false }).then(({ data }) => {
      setAllIds((data ?? []).map(r => r.id));
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from("letter_records").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { navigate("/dashboard/letter/all"); return; }
      setRecord(data);
      setForm({
        recipient: data.recipient ?? "",
        category: data.category ?? "",
        type: data.type ?? "",
        status: data.status ?? "pending",
        scan_status: data.scan_status ?? "",
        process_status: data.process_status ?? "",
        date_of_letter: data.date_of_letter ?? "",
      });
      setLoading(false);
    });
  }, [id, navigate]);

  const currentIndex = allIds.indexOf(id ?? "");
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1] : null;
  const nextId = currentIndex < allIds.length - 1 ? allIds[currentIndex + 1] : null;

  const handleSave = async () => {
    if (!id) return;
    setSaving(true);
    const { error } = await supabase.from("letter_records").update({
      recipient: form.recipient || null,
      category: form.category || null,
      type: form.type || null,
      status: form.status,
      scan_status: form.scan_status || null,
      process_status: form.process_status || null,
      date_of_letter: form.date_of_letter || null,
    }).eq("id", id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved successfully" });
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  const inputClass = "w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand-navy-500";

  return (
    <div className="p-3 md:p-6 max-w-5xl mx-auto space-y-4">
      {/* Header with nav */}
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/dashboard/letter/all")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to all letters
        </button>
        <div className="flex items-center gap-2">
          <button disabled={!prevId} onClick={() => prevId && navigate(`/dashboard/letter/${prevId}`)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">{currentIndex + 1} / {allIds.length}</span>
          <button disabled={!nextId} onClick={() => nextId && navigate(`/dashboard/letter/${nextId}`)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PDF Preview */}
        <div className="bg-card border border-border rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <FileText className="w-4 h-4 text-brand-red-500" />
            <span className="text-sm font-semibold text-foreground">PDF Preview</span>
            {record?.pdf_url && (
              <a href={record.pdf_url} target="_blank" rel="noopener noreferrer" className="ml-auto text-brand-navy-500 hover:text-brand-navy-700">
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
          {record?.pdf_url ? (
            <iframe src={record.pdf_url} className="w-full h-[500px] bg-muted" />
          ) : (
            <div className="h-[500px] flex items-center justify-center text-muted-foreground text-sm">No PDF uploaded</div>
          )}
        </div>

        {/* Edit form */}
        <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
          <h2 className="text-sm font-semibold text-foreground">Record Details</h2>
          <div className="text-xs text-muted-foreground font-mono">{record?.id}</div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Recipient</label>
              <input className={inputClass} value={form.recipient} onChange={e => setForm(f => ({ ...f, recipient: e.target.value }))} placeholder="Recipient name" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Category</label>
                <input className={inputClass} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Medical" />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Type</label>
                <input className={inputClass} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} placeholder="e.g. Invoice" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
                <select className={inputClass} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="pending">Pending</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Date of Letter</label>
                <input type="date" className={inputClass} value={form.date_of_letter} onChange={e => setForm(f => ({ ...f, date_of_letter: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Scan Status</label>
                <select className={inputClass} value={form.scan_status} onChange={e => setForm(f => ({ ...f, scan_status: e.target.value }))}>
                  <option value="">—</option>
                  <option value="pending">Pending</option>
                  <option value="scanned">Scanned</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">Process Status</label>
                <select className={inputClass} value={form.process_status} onChange={e => setForm(f => ({ ...f, process_status: e.target.value }))}>
                  <option value="">—</option>
                  <option value="pending">Pending</option>
                  <option value="processed">Processed</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>
          </div>

          {/* Payload JSON read-only */}
          {record?.payload && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">Extracted Payload</label>
              <pre className="bg-muted rounded-xl p-3 text-xs text-foreground overflow-auto max-h-40 font-mono">
                {JSON.stringify(record.payload, null, 2)}
              </pre>
            </div>
          )}

          <button onClick={handleSave} disabled={saving} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-navy-800 text-primary-foreground text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-50 transition-colors shadow-sm">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
