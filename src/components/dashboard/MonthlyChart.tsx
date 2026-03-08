import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { useSearchParams } from "react-router-dom";

interface MonthlyChartProps {
  data: { month: string; EKV: number; Letter: number }[];
  selectedYear: number;
  availableYears: number[];
  ekvTotal: number;
  letterTotal: number;
}

export default function MonthlyChart({ data, selectedYear, availableYears, ekvTotal, letterTotal }: MonthlyChartProps) {
  const [, setSearchParams] = useSearchParams();

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Monthly Overview</h3>
          <div className="flex gap-4 mt-1">
            <span className="text-xs text-muted-foreground">EKV: <strong className="text-foreground">{ekvTotal}</strong></span>
            <span className="text-xs text-muted-foreground">Letters: <strong className="text-foreground">{letterTotal}</strong></span>
          </div>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSearchParams({ year: e.target.value })}
          className="text-sm bg-muted border border-border rounded-lg px-3 py-1.5 text-foreground focus:outline-none focus:ring-2 focus:ring-brand-navy-500"
        >
          {availableYears.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} barGap={2}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
            <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "0.75rem",
                fontSize: "0.875rem",
              }}
            />
            <Legend iconType="circle" wrapperStyle={{ fontSize: "0.75rem" }} />
            <Bar dataKey="EKV" fill="hsl(var(--brand-red-600))" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Letter" fill="hsl(var(--brand-navy-500))" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
