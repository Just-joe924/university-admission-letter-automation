import { TrendingUp } from "lucide-react";

export default function StatCard({ title, value, icon: Icon, iconBg }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-8 min-h-48">
      <div className="flex items-start justify-between mb-8">
        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center ${iconBg}`}>
          <Icon className="w-8 h-8" />
        </div>

        <TrendingUp className="w-7 h-7 text-green-500" />
      </div>

      <p className="text-lg font-semibold text-slate-700 mb-3">{title}</p>
      <h3 className="text-5xl font-semibold text-primary leading-none">
        {value ?? 0}
      </h3>
    </div>
  );
}