import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";

export default async function LogsPage() {
  const supabase = await createClient();

  const [{ data: logs }, { count: aiScanCount }] = await Promise.all([
    supabase
      .from("activity_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(100),
    supabase
      .from("activity_logs")
      .select("*", { count: "exact", head: true })
      .eq("action", "AI PDF analyzed"),
  ]);

  return (
    <div className="p-3 md:p-6 space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500">Last 100 events</p>
      </div>

      <div className="flex gap-3">
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-col gap-0.5 min-w-[140px]">
          <span className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Total AI Scans</span>
          <span className="text-2xl font-bold text-brand-navy-800">{aiScanCount ?? 0}</span>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
        <table className="w-full text-xs md:text-sm whitespace-nowrap">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px] md:text-xs">Time</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px] md:text-xs">Module</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px] md:text-xs">Action</th>
              <th className="text-left px-3 py-2.5 font-semibold text-gray-500 uppercase tracking-wide text-[10px] md:text-xs hidden md:table-cell">Record ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs?.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2 text-gray-500">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </td>
                <td className="px-3 py-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                    log.module === "ekv"
                      ? "bg-brand-red-100 text-brand-red-800"
                      : "bg-brand-gold-100 text-brand-gold-700"
                  }`}>
                    {log.module?.toUpperCase()}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-700 max-w-[240px] truncate">{log.action}</td>
                <td className="px-3 py-2 text-gray-400 font-mono text-[10px] hidden md:table-cell">{log.record_id}</td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400 text-sm">
                  No activity logs found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
