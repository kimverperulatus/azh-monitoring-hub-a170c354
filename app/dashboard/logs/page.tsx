import { createClient } from "@/lib/supabase/server";
import { formatDistanceToNow } from "date-fns";

export default async function LogsPage() {
  const supabase = await createClient();

  const { data: logs } = await supabase
    .from("activity_logs")
    .select("*")
    .order("timestamp", { ascending: false })
    .limit(100);

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
        <p className="text-sm text-gray-500">Last 100 events</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Module</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
              <th className="text-left px-4 py-3 font-medium text-gray-600">Record ID</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {logs?.map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                  {formatDistanceToNow(new Date(log.timestamp), { addSuffix: true })}
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    log.module === "ekv"
                      ? "bg-blue-100 text-blue-700"
                      : "bg-purple-100 text-purple-700"
                  }`}>
                    {log.module?.toUpperCase()}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-700">{log.action}</td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs">{log.record_id}</td>
              </tr>
            ))}
            {!logs?.length && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-gray-400">
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
