import { TrendingUp } from "lucide-react";

export default function StatCard({ title, value, icon: Icon, iconBg }) {
  return (
    <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
          <Icon className="w-6 h-6" />
        </div>

        <TrendingUp className="w-5 h-5 text-green-500" />
      </div>

      <p className="text-sm font-semibold text-slate-700 mb-1">{title}</p>
      <h3 className="text-3xl font-semibold text-primary leading-none">
        {value ?? 0}
      </h3>
    </div>
  );
}