import { Bell, Search } from "lucide-react";

export default function Header() {
  return (
    <header className="h-24 bg-white border-b border-slate-200 flex items-center justify-between px-12 sticky top-0 z-40">
      <div className="relative w-full max-w-3xl">
        <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />

        <input
          type="text"
          placeholder="Search students, departments..."
          className="w-full h-14 rounded-2xl border border-slate-300 bg-white pl-14 pr-5 text-lg outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      <button className="relative w-12 h-12 flex items-center justify-center rounded-xl hover:bg-slate-100 transition">
        <Bell className="w-7 h-7 text-slate-700" />
        <span className="absolute top-2 right-2 w-3 h-3 rounded-full bg-red-500 border-2 border-white" />
      </button>
    </header>
  );
}