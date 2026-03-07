import { FileText, CheckCircle2, XCircle, AlertTriangle, Clock, MinusCircle, Hash } from "lucide-react";

type Color = "blue" | "yellow" | "green" | "red" | "orange" | "gray";
type Icon = "total" | undefined;

const colorConfig: Record<Color, { card: string; icon: string; value: string; iconBg: string }> = {
  blue:   { card: "bg-white border-blue-100",   iconBg: "bg-blue-50",   icon: "text-blue-500",   value: "text-blue-900" },
  yellow: { card: "bg-white border-yellow-100", iconBg: "bg-yellow-50", icon: "text-yellow-500", value: "text-yellow-900" },
  green:  { card: "bg-white border-green-100",  iconBg: "bg-green-50",  icon: "text-green-500",  value: "text-green-900" },
  red:    { card: "bg-white border-red-100",    iconBg: "bg-red-50",    icon: "text-red-500",    value: "text-red-900" },
  orange: { card: "bg-white border-orange-100", iconBg: "bg-orange-50", icon: "text-orange-500", value: "text-orange-900" },
  gray:   { card: "bg-white border-gray-200",   iconBg: "bg-gray-50",   icon: "text-gray-400",   value: "text-gray-700" },
};

const labelIconMap: Record<string, React.ElementType> = {
  "Total Records": Hash,
  "Pending":       Clock,
  "Approved":      CheckCircle2,
  "Rejected":      XCircle,
  "Error":         AlertTriangle,
  "Closed Lost":   MinusCircle,
};

export default function StatsCard({
  label,
  value,
  color,
  icon: iconOverride,
}: {
  label: string;
  value: number;
  color: Color;
  icon?: Icon;
}) {
  const cfg = colorConfig[color];
  const IconComp = iconOverride === "total" ? FileText : (labelIconMap[label] ?? Hash);

  return (
    <div className={`rounded-xl border shadow-sm p-4 flex items-start gap-3 hover:shadow-md transition-shadow duration-200 ${cfg.card}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${cfg.iconBg}`}>
        <IconComp className={`w-4 h-4 ${cfg.icon}`} />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-gray-500 leading-none truncate">{label}</p>
        <p className={`text-2xl font-bold mt-1 leading-none tabular-nums ${cfg.value}`}>{value.toLocaleString()}</p>
      </div>
    </div>
  );
}
