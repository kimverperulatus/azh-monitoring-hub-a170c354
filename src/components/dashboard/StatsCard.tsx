interface StatusCount {
  status: string;
  count: number;
}

interface StatsCardProps {
  title: string;
  total: number;
  statusCounts: StatusCount[];
  colorMap?: Record<string, string>;
}

const defaultColors: Record<string, string> = {
  Pending: "bg-brand-gold-100 text-brand-gold-800",
  Approved: "bg-green-100 text-green-800",
  Rejected: "bg-brand-red-100 text-brand-red-800",
  Error: "bg-orange-100 text-orange-800",
  "Closed Lost": "bg-muted text-muted-foreground",
  success: "bg-green-100 text-green-800",
  pending: "bg-brand-gold-100 text-brand-gold-800",
  failed: "bg-brand-red-100 text-brand-red-800",
};

export default function StatsCard({ title, total, statusCounts, colorMap }: StatsCardProps) {
  const colors = colorMap ?? defaultColors;

  return (
    <div className="bg-card border border-border rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{title}</h3>
        <span className="text-2xl font-bold text-foreground">{total}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {statusCounts.map(({ status, count }) => (
          <span
            key={status}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${colors[status] ?? "bg-muted text-muted-foreground"}`}
          >
            {status}
            <span className="font-bold">{count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
