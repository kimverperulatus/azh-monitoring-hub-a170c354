type Color = "blue" | "yellow" | "green" | "red" | "orange" | "gray";

const colorMap: Record<Color, string> = {
  blue:   "bg-blue-50 text-blue-700 border-blue-100",
  yellow: "bg-yellow-50 text-yellow-700 border-yellow-100",
  green:  "bg-green-50 text-green-700 border-green-100",
  red:    "bg-red-50 text-red-700 border-red-100",
  orange: "bg-orange-50 text-orange-700 border-orange-100",
  gray:   "bg-gray-100 text-gray-600 border-gray-200",
};

const valueColorMap: Record<Color, string> = {
  blue:   "text-blue-900",
  yellow: "text-yellow-900",
  green:  "text-green-900",
  red:    "text-red-900",
  orange: "text-orange-900",
  gray:   "text-gray-700",
};

export default function StatsCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: Color;
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium uppercase tracking-wide opacity-70">{label}</p>
      <p className={`text-3xl font-bold mt-1 ${valueColorMap[color]}`}>{value}</p>
    </div>
  );
}
