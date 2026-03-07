import { formatDistanceToNow } from "date-fns";
import { Upload, FileText, Mail, ArrowRight } from "lucide-react";

type Activity = {
  id: string;
  module: string;
  action: string;
  record_id: string;
  timestamp: string;
};

function isImport(action: string) {
  return action?.toLowerCase().startsWith("import:");
}

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-3">
          <ArrowRight className="w-5 h-5 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400 font-medium">No recent activity</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm divide-y divide-gray-50 overflow-hidden">
      {activities.map((activity, idx) => {
        const isEkv = activity.module === "ekv";
        const ModuleIcon = isEkv ? FileText : Mail;
        return (
          <div
            key={activity.id}
            className="flex items-center gap-3.5 px-5 py-3 hover:bg-slate-50 transition-colors duration-150"
            style={{ animationDelay: `${idx * 30}ms` }}
          >
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isEkv ? "bg-brand-red-50" : "bg-brand-gold-50"}`}>
              <ModuleIcon className={`w-3.5 h-3.5 ${isEkv ? "text-brand-red-700" : "text-brand-gold-600"}`} />
            </div>
            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider shrink-0 ${isEkv ? "bg-brand-red-100 text-brand-red-800" : "bg-brand-gold-100 text-brand-gold-700"}`}>
              {activity.module?.toUpperCase()}
            </span>
            {isImport(activity.action) ? (
              <span className="flex items-center gap-1.5 text-sm text-gray-600 flex-1 min-w-0">
                <Upload className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="truncate">{activity.action.replace(/^import:\s*/i, "")}</span>
              </span>
            ) : (
              <span className="text-sm text-gray-600 flex-1 min-w-0 truncate">{activity.action}</span>
            )}
            <span className="text-xs text-gray-400 whitespace-nowrap shrink-0">
              {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
