import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Save, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function EkvDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [record, setRecord] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [allIds, setAllIds] = useState<string[]>([]);
  const [status, setStatus] = useState("pending");
  const [payloadStr, setPayloadStr] = useState("{}");
  const [payloadError, setPayloadError] = useState("");

  useEffect(() => {
    supabase.from("ekv_records").select("id").order("created_at", { ascending: false }).then(({ data }) => {
      setAllIds((data ?? []).map(r => r.id));
    });
  }, []);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    supabase.from("ekv_records").select("*").eq("id", id).single().then(({ data, error }) => {
      if (error || !data) { navigate("/dashboard/ekv"); return; }
      setRecord(data);
      setStatus(data.status);
      setPayloadStr(JSON.stringify(data.payload ?? {}, null, 2));
      setLoading(false);
    });
  }, [id, navigate]);

  const currentIndex = allIds.indexOf(id ?? "");
  const prevId = currentIndex > 0 ? allIds[currentIndex - 1] : null;
  const nextId = currentIndex < allIds.length - 1 ? allIds[currentIndex + 1] : null;

  const handlePayloadChange = (val: string) => {
    setPayloadStr(val);
    try { JSON.parse(val); setPayloadError(""); } catch { setPayloadError("Invalid JSON"); }
  };

  const handleSave = async () => {
    if (payloadError || !id) return;
    setSaving(true);
    const { error } = await supabase.from("ekv_records").update({
      status,
      payload: JSON.parse(payloadStr),
    }).eq("id", id);
    setSaving(false);
    if (error) toast({ title: "Save failed", description: error.message, variant: "destructive" });
    else toast({ title: "Saved successfully" });
  };

  if (loading) return <div className="p-6 text-center text-muted-foreground">Loading...</div>;

  const inputClass = "w-full bg-card border border-border rounded-xl px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand-navy-500";

  return (
    <div className="p-3 md:p-6 max-w-3xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/dashboard/ekv")} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to EKV
        </button>
        <div className="flex items-center gap-2">
          <button disabled={!prevId} onClick={() => prevId && navigate(`/dashboard/ekv/${prevId}`)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-muted-foreground">{currentIndex + 1} / {allIds.length}</span>
          <button disabled={!nextId} onClick={() => nextId && navigate(`/dashboard/ekv/${nextId}`)} className="p-2 rounded-lg border border-border hover:bg-muted disabled:opacity-30 transition-colors">
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-foreground">EKV Record Details</h2>
        <div className="text-xs text-muted-foreground font-mono">{record?.id}</div>
        <div className="text-xs text-muted-foreground">Created: {new Date(record?.created_at).toLocaleString()}</div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Status</label>
          <select className={inputClass} value={status} onChange={e => setStatus(e.target.value)}>
            <option value="pending">Pending</option>
            <option value="success">Success</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Payload (JSON)</label>
          <textarea
            className={`${inputClass} font-mono min-h-[200px] resize-y`}
            value={payloadStr}
            onChange={e => handlePayloadChange(e.target.value)}
          />
          {payloadError && <p className="text-xs text-destructive mt-1">{payloadError}</p>}
        </div>

        {record?.error_message && (
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Error Message</label>
            <p className="text-sm text-destructive bg-brand-red-50 rounded-xl p-3">{record.error_message}</p>
          </div>
        )}

        <button onClick={handleSave} disabled={saving || !!payloadError} className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-brand-navy-800 text-primary-foreground text-sm font-medium rounded-xl hover:bg-brand-navy-700 disabled:opacity-50 transition-colors shadow-sm">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}
