import { createClient } from "@/lib/supabase/server";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import { Suspense } from "react";

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

function aggregateByMonth(dates: (string | null)[], year: number): number[] {
  const counts = new Array(12).fill(0);
  for (const d of dates) {
    if (!d) continue;
    const dt = new Date(d);
    if (dt.getFullYear() === year) {
      counts[dt.getMonth()]++;
    }
  }
  return counts;
}

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(params?.year ?? currentYear.toString());
  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3].filter(y => y > 2020);

  const supabase = await createClient();

  const [
    ekvCounts,
    letterCounts,
    ekvTotal,
    letterTotal,
    recentActivity,
    ekvDatesRes,
    letterDatesRes,
  ] = await Promise.all([
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
    supabase
      .from("ekv_records")
      .select("kv_angelegt")
      .not("kv_angelegt", "is", null),
    supabase
      .from("letter_records")
      .select("date_of_letter")
      .not("date_of_letter", "is", null),
  ]);

  const ekvDates = (ekvDatesRes.data ?? []).map((r) => r.kv_angelegt as string | null);
  const letterDates = (letterDatesRes.data ?? []).map((r) => r.date_of_letter as string | null);

  const ekvMonthly = aggregateByMonth(ekvDates, selectedYear);
  const letterMonthly = aggregateByMonth(letterDates, selectedYear);

  const chartData = MONTH_LABELS.map((month, i) => ({
    month,
    EKV: ekvMonthly[i],
    Letter: letterMonthly[i],
  }));

  const ekvYearTotal = ekvMonthly.reduce((a, b) => a + b, 0);
  const letterYearTotal = letterMonthly.reduce((a, b) => a + b, 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Carebox monitoring dashboard</p>
      </div>

      {/* EKV Stats */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-blue-500 inline-block" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">EKV Module</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatsCard label="Total Records" value={ekvTotal} color="blue" icon="total" />
          {ekvCounts.map(({ status, count }) => (
            <StatsCard key={status} label={status} value={count} color={getColor(status)} />
          ))}
        </div>
      </section>

      {/* Letter Stats */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-violet-500 inline-block" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Letter Module</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatsCard label="Total Records" value={letterTotal} color="blue" icon="total" />
          {letterCounts.map(({ status, count }) => (
            <StatsCard key={status} label={status} value={count} color={getColor(status)} />
          ))}
        </div>
      </section>

      {/* Monthly Chart */}
      <section>
        <Suspense fallback={<div className="h-80 bg-white rounded-2xl border border-gray-100 animate-pulse" />}>
          <MonthlyChart
            data={chartData}
            selectedYear={selectedYear}
            availableYears={availableYears}
            ekvTotal={ekvYearTotal}
            letterTotal={letterYearTotal}
          />
        </Suspense>
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-gray-400 inline-block" />
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Activity</h2>
        </div>
        <ActivityFeed activities={recentActivity} />
      </section>
    </div>
  );
}
