import { formatDistanceToNow } from "date-fns";

type Activity = {
  id: string;
  module: string;
  action: string;
  record_id: string;
  timestamp: string;
};

export default function ActivityFeed({ activities }: { activities: Activity[] }) {
  if (!activities.length) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-400">
        No recent activity
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
      {activities.map((activity) => (
        <div key={activity.id} className="flex items-center gap-4 px-4 py-3">
          <span
            className={`px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${
              activity.module === "ekv"
                ? "bg-blue-100 text-blue-700"
                : "bg-purple-100 text-purple-700"
            }`}
          >
            {activity.module?.toUpperCase()}
          </span>
          <span className="text-sm text-gray-700 flex-1">{activity.action}</span>
          <span className="text-xs text-gray-400 whitespace-nowrap">
            {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
          </span>
        </div>
      ))}
    </div>
  );
}
