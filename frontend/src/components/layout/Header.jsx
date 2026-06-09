import { Menu, Search } from "lucide-react";

export default function Header({ onMenuClick = () => {} }) {
  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center gap-3 justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
      <button
        onClick={onMenuClick}
        className="lg:hidden w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-100 transition shrink-0"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5 text-slate-700" />
      </button>

      <div className="relative w-full max-w-xl">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />

        <input
          type="text"
          placeholder="Search students, departments..."
          className="w-full h-11 rounded-xl border border-slate-300 bg-white pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>
    </header>
  );
}