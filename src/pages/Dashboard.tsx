import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, List, Upload, ScrollText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import StatsCard from "@/components/dashboard/StatsCard";
import ActivityFeed from "@/components/dashboard/ActivityFeed";
import MonthlyChart from "@/components/dashboard/MonthlyChart";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function aggregateByMonth(dates: (string | null)[], year: number): number[] {
  const counts = new Array(12).fill(0);
  for (const d of dates) {
    if (!d) continue;
    const dt = new Date(d);
    if (dt.getFullYear() === year) counts[dt.getMonth()]++;
  }
  return counts;
}

interface StatusCount { status: string; count: number }

export default function DashboardPage() {
  const { allowedPages } = useAuth();
  const [searchParams] = useSearchParams();
  const currentYear = new Date().getFullYear();
  const selectedYear = parseInt(searchParams.get("year") ?? currentYear.toString());
  const availableYears = [currentYear, currentYear - 1, currentYear - 2, currentYear - 3].filter(y => y > 2020);

  const [ekvCounts, setEkvCounts] = useState<StatusCount[]>([]);
  const [letterCounts, setLetterCounts] = useState<StatusCount[]>([]);
  const [ekvTotal, setEkvTotal] = useState(0);
  const [letterTotal, setLetterTotal] = useState(0);
  const [activities, setActivities] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);
  const [ekvYearTotal, setEkvYearTotal] = useState(0);
  const [letterYearTotal, setLetterYearTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const yearStart = `${selectedYear}-01-01`;
      const yearEnd = `${selectedYear}-12-31`;

      const [ekvRes, letterRes, activityRes, ekvDatesRes, letterDatesRes] = await Promise.all([
        supabase.from("ekv_records").select("status"),
        supabase.from("letter_records").select("status"),
        supabase.from("activity_logs").select("*").order("timestamp", { ascending: false }).limit(10),
        supabase.from("ekv_records").select("created_at").gte("created_at", yearStart).lte("created_at", yearEnd),
        supabase.from("letter_records").select("created_at").gte("created_at", yearStart).lte("created_at", yearEnd),
      ]);

      // Status counts
      const ekvData = ekvRes.data ?? [];
      const ekvCountMap: Record<string, number> = {};
      ekvData.forEach((r: any) => { ekvCountMap[r.status] = (ekvCountMap[r.status] ?? 0) + 1; });
      setEkvCounts(Object.entries(ekvCountMap).map(([status, count]) => ({ status, count })));
      setEkvTotal(ekvData.length);

      const letterData = letterRes.data ?? [];
      const letterCountMap: Record<string, number> = {};
      letterData.forEach((r: any) => { letterCountMap[r.status] = (letterCountMap[r.status] ?? 0) + 1; });
      setLetterCounts(Object.entries(letterCountMap).map(([status, count]) => ({ status, count })));
      setLetterTotal(letterData.length);

      setActivities(activityRes.data ?? []);

      // Monthly chart
      const ekvDates = (ekvDatesRes.data ?? []).map((r: any) => r.created_at);
      const letterDates = (letterDatesRes.data ?? []).map((r: any) => r.created_at);
      const ekvMonthly = aggregateByMonth(ekvDates, selectedYear);
      const letterMonthly = aggregateByMonth(letterDates, selectedYear);

      setChartData(MONTH_LABELS.map((month, i) => ({ month, EKV: ekvMonthly[i], Letter: letterMonthly[i] })));
      setEkvYearTotal(ekvMonthly.reduce((a, b) => a + b, 0));
      setLetterYearTotal(letterMonthly.reduce((a, b) => a + b, 0));
      setLoading(false);
    }
    fetchData();
  }, [selectedYear]);

  return (
    <div className="p-3 md:p-6 space-y-4 md:space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-xl font-bold text-foreground tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Carebox monitoring dashboard</p>
      </div>

      {/* Quick Nav */}
      <section>
        <div className="flex flex-wrap gap-2 md:gap-3">
          {allowedPages.includes("ekv") && (
            <Link to="/dashboard/ekv" className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-brand-red-300 hover:bg-brand-red-50/40 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-brand-red-100 flex items-center justify-center shrink-0">
                <FileText className="w-4 h-4 text-brand-red-700" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-brand-red-800">EKV</span>
            </Link>
          )}
          {allowedPages.includes("letter_all") && (
            <Link to="/dashboard/letter/all" className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-brand-gold-400 hover:bg-brand-gold-50/40 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-brand-gold-100 flex items-center justify-center shrink-0">
                <List className="w-4 h-4 text-brand-gold-700" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-brand-gold-800">All Scan Letters</span>
            </Link>
          )}
          {allowedPages.includes("letter_upload") && (
            <Link to="/dashboard/letter/upload" className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-brand-navy-300 hover:bg-brand-navy-50/40 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-brand-navy-100 flex items-center justify-center shrink-0">
                <Upload className="w-4 h-4 text-brand-navy-600" />
              </div>
              <span className="text-sm font-semibold text-foreground group-hover:text-brand-navy-700">Upload Scan Letters</span>
            </Link>
          )}
          {allowedPages.includes("logs") && (
            <Link to="/dashboard/logs" className="flex items-center gap-3 px-4 py-3 bg-card border border-border rounded-xl hover:border-muted-foreground/30 hover:bg-muted/50 transition-colors group">
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                <ScrollText className="w-4 h-4 text-muted-foreground" />
              </div>
              <span className="text-sm font-semibold text-foreground">Logs</span>
            </Link>
          )}
        </div>
      </section>

      {/* Stats */}
      {!loading && (
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <StatsCard title="EKV Records" total={ekvTotal} statusCounts={ekvCounts} />
          <StatsCard title="Letter Records" total={letterTotal} statusCounts={letterCounts} />
        </section>
      )}

      {/* Monthly Chart */}
      <section>
        <MonthlyChart
          data={chartData}
          selectedYear={selectedYear}
          availableYears={availableYears}
          ekvTotal={ekvYearTotal}
          letterTotal={letterYearTotal}
        />
      </section>

      {/* Recent Activity */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="w-1.5 h-4 rounded-full bg-brand-navy-300 inline-block" />
          <h2 className="text-sm font-semibold text-brand-navy-800 uppercase tracking-wide">Recent Activity</h2>
        </div>
        <ActivityFeed activities={activities} />
      </section>
    </div>
  );
}
