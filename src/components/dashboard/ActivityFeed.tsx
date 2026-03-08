import { formatDistanceToNow } from "date-fns";
import { FileText, Mail, ScrollText } from "lucide-react";

interface Activity {
  id: string;
  module: string;
  action: string;
  record_id: string | null;
  user_id: string | null;
  timestamp: string;
}

const moduleIcons: Record<string, typeof FileText> = {
  ekv: FileText,
  letter: Mail,
};

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 text-center text-muted-foreground text-sm">
        No recent activity
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl divide-y divide-border">
      {activities.map((a) => {
        const Icon = moduleIcons[a.module] ?? ScrollText;
        return (
          <div key={a.id} className="flex items-center gap-3 px-4 py-3">
            <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
              <Icon className="w-4 h-4 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground truncate">
                <span className="font-medium capitalize">{a.module}</span>
                {" — "}
                {a.action}
              </p>
              {a.record_id && (
                <p className="text-xs text-muted-foreground truncate">ID: {a.record_id}</p>
              )}
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {formatDistanceToNow(new Date(a.timestamp), { addSuffix: true })}
            </span>
          </div>
        );
      })}
    </div>
  );
}
