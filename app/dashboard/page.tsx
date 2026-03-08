import { createClient } from "@/lib/supabase/server";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import MonthlyChart from "@/components/dashboard/MonthlyChart";
import { Suspense } from "react";
import Link from "next/link";
import { FileText, List, Upload, ScrollText } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_COLORS: Record<string, "yellow" | "green" | "red" | "orange" | "gray" | "navy"> = {
  Pending:       "yellow",
  Approved:      "green",
  Rejected:      "red",
  Error:         "orange",
  "Closed Lost": "gray",
};

function getColor(status: string): "yellow" | "green" | "red" | "orange" | "gray" | "navy" {
  return STATUS_COLORS[status] ?? "navy";
}

// Fetch just the status column — one query instead of 5+1 per table
async function getStatusData(supabase: Awaited<ReturnType<typeof createClient>>, table: string) {
  const { data } = await supabase.from(table).select("status");
  const counts: Record<string, number> = {};
  let total = 0;
  for (const r of data ?? []) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    total++;
  }
  const statusCounts = Object.entries(counts)
    .map(([status, count]) => ({ status, count }))
    .filter((r) => r.count > 0)
    .sort((a, b) => a.status.localeCompare(b.status));
  return { statusCounts, total };
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

  const yearStart = `${selectedYear}-01-01`;
  const yearEnd   = `${selectedYear}-12-31`;

  const [
    ekvData,
    letterData,
    recentActivity,
    ekvDatesRes,
    letterDatesRes,
  ] = await Promise.all([
    getStatusData(supabase, "ekv_records"),
    getStatusData(supabase, "letter_records"),
    supabase
      .from("activity_logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(10)
      .then(({ data }) => data ?? []),
    supabase
      .from("ekv_records")
      .select("kv_angelegt")
      .not("kv_angelegt", "is", null)
      .gte("kv_angelegt", yearStart)
      .lte("kv_angelegt", yearEnd),
    supabase
      .from("letter_records")
      .select("date_of_letter")
      .not("date_of_letter", "is", null)
      .gte("date_of_letter", yearStart)
      .lte("date_of_letter", yearEnd),
  ]);

  const { statusCounts: ekvCounts, total: ekvTotal } = ekvData;
  const { statusCounts: letterCounts, total: letterTotal } = letterData;

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
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">Overview</h1>
        <p className="text-sm text-gray-400 mt-0.5">Carebox monitoring dashboard</p>
      </div>

      {/* Quick Nav */}
      <section>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 md:gap-3">
          <Link href="/dashboard/ekv" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-brand-red-300 hover:bg-brand-red-50/40 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-brand-red-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-brand-red-700" />
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-red-800">EKV</span>
          </Link>
          <Link href="/dashboard/letter/all" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-brand-gold-400 hover:bg-brand-gold-50/40 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-brand-gold-100 flex items-center justify-center shrink-0">
              <List className="w-4 h-4 text-brand-gold-700" />
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-brand-gold-800">All Scan Letters</span>
          </Link>
          <Link href="/dashboard/letter/upload" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/40 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
              <Upload className="w-4 h-4 text-blue-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-blue-700">Upload Scan Letters</span>
          </Link>
          <Link href="/dashboard/logs" className="flex items-center gap-3 px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-gray-400 hover:bg-gray-50 transition-colors group">
            <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
              <ScrollText className="w-4 h-4 text-gray-600" />
            </div>
            <span className="text-sm font-semibold text-gray-700 group-hover:text-gray-900">Logs</span>
          </Link>
        </div>
      </section>

      {/* EKV Stats */}
      <section>
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <span className="w-1.5 h-4 rounded-full bg-brand-red-800 inline-block" />
          <h2 className="text-xs font-semibold text-brand-navy-800 uppercase tracking-wide">EKV Module</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          <StatsCard label="Total Records" value={ekvTotal} color="navy" icon="total" />
          {ekvCounts.map(({ status, count }) => (
            <StatsCard key={status} label={status} value={count} color={getColor(status)} />
          ))}
        </div>
      </section>

      {/* Letter Stats */}
      <section>
        <div className="flex items-center gap-2 mb-2 md:mb-3">
          <span className="w-1.5 h-4 rounded-full bg-brand-gold-500 inline-block" />
          <h2 className="text-xs font-semibold text-brand-navy-800 uppercase tracking-wide">Letter Module</h2>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2 md:gap-3">
          <StatsCard label="Total Records" value={letterTotal} color="navy" icon="total" />
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
          <span className="w-1.5 h-4 rounded-full bg-brand-navy-300 inline-block" />
          <h2 className="text-sm font-semibold text-brand-navy-800 uppercase tracking-wide">Recent Activity</h2>
        </div>
        <ActivityFeed activities={recentActivity} />
      </section>
    </div>
  );
}
