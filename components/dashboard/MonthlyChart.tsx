"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, FileText, Mail } from "lucide-react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type MonthlyPoint = {
  month: string;
  EKV: number;
  Letter: number;
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-semibold text-gray-700 mb-2">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 text-gray-600">
          <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: entry.color }} />
          <span>{entry.name}:</span>
          <span className="font-semibold text-gray-900">{entry.value}</span>
        </div>
      ))}
    </div>
  );
};

export default function MonthlyChart({
  data,
  selectedYear,
  availableYears,
  ekvTotal,
  letterTotal,
}: {
  data: MonthlyPoint[];
  selectedYear: number;
  availableYears: number[];
  ekvTotal: number;
  letterTotal: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setYear(year: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("year", year.toString());
    router.push(`${pathname}?${params.toString()}`);
  }

  const ekvPeak = data.reduce((max, d) => d.EKV > max ? d.EKV : max, 0);
  const letterPeak = data.reduce((max, d) => d.Letter > max ? d.Letter : max, 0);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-navy-800 to-brand-red-800 flex items-center justify-center shadow-sm">
            <TrendingUp className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Monthly Applications</h3>
            <p className="text-xs text-gray-400">EKV vs Letter records over time</p>
          </div>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setYear(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded-lg px-3 py-1.5 text-gray-600 bg-gray-50 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer font-medium"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      {/* Summary Pills */}
      <div className="px-6 pt-4 flex items-center gap-3">
        <div className="flex items-center gap-2 bg-brand-red-50 rounded-lg px-3 py-1.5 border border-brand-red-100">
          <FileText className="w-3.5 h-3.5 text-brand-red-700" />
          <span className="text-xs font-medium text-brand-red-800">EKV {selectedYear}</span>
          <span className="text-xs font-bold text-brand-red-900">{ekvTotal}</span>
          {ekvPeak > 0 && <span className="text-xs text-brand-red-500">· peak {ekvPeak}/mo</span>}
        </div>
        <div className="flex items-center gap-2 bg-brand-gold-50 rounded-lg px-3 py-1.5 border border-brand-gold-100">
          <Mail className="w-3.5 h-3.5 text-brand-gold-600" />
          <span className="text-xs font-medium text-brand-gold-700">Letter {selectedYear}</span>
          <span className="text-xs font-bold text-brand-gold-900">{letterTotal}</span>
          {letterPeak > 0 && <span className="text-xs text-brand-gold-500">· peak {letterPeak}/mo</span>}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pb-4 pt-3">
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={data} margin={{ top: 5, right: 24, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
            <XAxis
              dataKey="month"
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#94a3b8" }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              formatter={(value) => (
                <span style={{ fontSize: "12px", color: "#64748b", fontWeight: 500 }}>{value}</span>
              )}
            />
            <Line
              type="monotone"
              dataKey="EKV"
              stroke="#7a1c2a"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#7a1c2a", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "#7a1c2a", stroke: "#fff", strokeWidth: 2 }}
            />
            <Line
              type="monotone"
              dataKey="Letter"
              stroke="#c2a040"
              strokeWidth={2.5}
              dot={{ r: 4, fill: "#c2a040", strokeWidth: 2, stroke: "#fff" }}
              activeDot={{ r: 6, fill: "#c2a040", stroke: "#fff", strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
