import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

const COLORS = ["#0B1F51", "#2448A6"];

export default function ModeOfEntryChart({ data = [] }) {
  const chartData = data.map((item) => ({
    name: item.mode,
    value: item.count,
  }));

  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 h-[430px]">
      <h2 className="text-2xl font-bold text-primary mb-6">
        Mode of Entry Distribution
      </h2>

      <ResponsiveContainer width="100%" height={310}>
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            outerRadius={120}
            label={({ name, percent }) =>
              `${name}: ${(percent * 100).toFixed(0)}%`
            }
          >
            {chartData.map((_, index) => (
              <Cell key={index} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}