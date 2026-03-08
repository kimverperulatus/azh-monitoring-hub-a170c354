import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { FileText, Mail, ScrollText } from "lucide-react";

const moduleIcons: Record<string, typeof FileText> = { ekv: FileText, letter: Mail };

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetch() {
      setLoading(true);
      const { data } = await supabase
        .from("activity_logs")
        .select("*")
        .order("timestamp", { ascending: false })
        .limit(100);
      setLogs(data ?? []);
      setLoading(false);
    }
    fetch();
  }, []);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Activity Logs</h1>
        <p className="text-sm text-muted-foreground mt-0.5">All system activity and audit trail</p>
      </div>

      <div className="bg-card border border-border rounded-2xl divide-y divide-border">
        {loading ? (
          <div className="px-4 py-8 text-center text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="px-4 py-8 text-center text-muted-foreground">No logs yet</div>
        ) : (
          logs.map((log) => {
            const Icon = moduleIcons[log.module] ?? ScrollText;
            return (
              <div key={log.id} className="flex items-center gap-3 px-4 py-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-medium capitalize">{log.module}</span>
                    {" — "}
                    {log.action}
                  </p>
                  {log.record_id && (
                    <p className="text-xs text-muted-foreground">Record: {log.record_id}</p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
