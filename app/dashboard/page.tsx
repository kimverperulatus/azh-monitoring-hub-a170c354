import { createClient } from "@/lib/supabase/server";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, "yellow" | "green" | "red" | "orange" | "gray" | "blue"> = {
  Pending:       "yellow",
  Approved:      "green",
  Rejected:      "red",
  Error:         "orange",
  "Closed Lost": "gray",
};

function getColor(status: string): "yellow" | "green" | "red" | "orange" | "gray" | "blue" {
  return STATUS_COLORS[status] ?? "blue";
}

const KNOWN_STATUSES = ["Pending", "Approved", "Rejected", "Error", "Closed Lost"];

async function getStatusCounts(supabase: Awaited<ReturnType<typeof createClient>>, table: string) {
  const results = await Promise.all(
    KNOWN_STATUSES.map(async (status) => {
      const { count } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true })
        .eq("status", status);
      return { status, count: count ?? 0 };
    })
  );
  return results.filter((r) => r.count > 0);
}

async function getTotal(supabase: Awaited<ReturnType<typeof createClient>>, table: string) {
  const { count } = await supabase
    .from(table)
    .select("*", { count: "exact", head: true });
  return count ?? 0;
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const [ekvCounts, letterCounts, ekvTotal, letterTotal, recentActivity] = await Promise.all([
    getStatusCounts(supabase, "ekv_records"),
    getStatusCounts(supabase, "letter_records"),
    getTotal(supabase, "ekv_records"),
    getTotal(supabase, "letter_records"),
    supabase
      .from("activity_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(10)
      .then(({ data }) => data ?? []),
  ]);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500">Carebox monitoring overview</p>
      </div>

      {/* EKV Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">EKV Module</h2>
        <div className="flex flex-wrap gap-4">
          <StatsCard label="Total" value={ekvTotal} color="blue" />
          {ekvCounts.map(({ status, count }) => (
            <StatsCard key={status} label={status} value={count} color={getColor(status)} />
          ))}
        </div>
      </section>

      {/* Letter Section */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Letter Module</h2>
        <div className="flex flex-wrap gap-4">
          <StatsCard label="Total" value={letterTotal} color="blue" />
          {letterCounts.map(({ status, count }) => (
            <StatsCard key={status} label={status} value={count} color={getColor(status)} />
          ))}
        </div>
      </section>

      {/* Recent Activity */}
      <section>
        <h2 className="text-lg font-semibold text-gray-700 mb-3">Recent Activity</h2>
        <ActivityFeed activities={recentActivity} />
      </section>
    </div>
  );
}
