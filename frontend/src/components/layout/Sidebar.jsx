import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  LogOut,
  X,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";
import culLogo from "../../assets/images/cul_logo_rect.png";

export default function Sidebar({ open = false, onClose = () => {} }) {
  const navigate = useNavigate();
  const { logout, admin } = useAuth();

  const links = [
    {
      label: "Dashboard",
      path: "/admin/dashboard",
      icon: LayoutDashboard,
    },
    {
      label: "Students",
      path: "/admin/students",
      icon: Users,
    },
    {
      label: "Admission Letters",
      path: "/admin/admission-letters",
      icon: FileText,
    },
    {
      label: "Email Logs",
      path: "/admin/email-logs",
      icon: Mail,
    },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/admin/login");
  };

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={onClose}
        className={[
          "fixed inset-0 z-40 bg-black/40 lg:hidden transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        className={[
          "fixed left-0 top-0 z-50 h-screen w-60 bg-white border-r border-slate-200 flex flex-col",
          "transform transition-transform duration-300 lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-200">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
            <img
              src={culLogo}
              alt="CUL logo"
              className="w-full h-full object-contain"
            />
          </div>

          <div className="min-w-0">
            <h1 className="text-base font-bold text-[#06163d] truncate">
              CUL Admin
            </h1>
            <p className="text-xs text-slate-500 truncate">Admission Portal</p>
          </div>

          <button
            onClick={onClose}
            className="ml-auto lg:hidden text-slate-500 hover:text-slate-800"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
          {links.map((link) => {
            const Icon = link.icon;

            return (
              <NavLink
                key={link.path}
                to={link.path}
                onClick={onClose}
                className={({ isActive }) =>
                  [
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all",
                    isActive
                      ? "bg-primary text-white shadow"
                      : "text-slate-700 hover:bg-slate-100",
                  ].join(" ")
                }
              >
                <Icon className="w-5 h-5" />
                {link.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="mt-auto px-3 py-4 border-t border-slate-200">
          <div className="bg-[#dfe8ff] rounded-xl px-3 py-3 flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold shrink-0">
              {admin?.full_name?.[0] || admin?.email?.[0] || "A"}
            </div>

            <div className="min-w-0">
              <p className="text-sm font-semibold text-[#06163d] truncate">
                {admin?.full_name || "Admin User"}
              </p>
              <p className="text-xs text-slate-600 truncate">
                {admin?.email || "—"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 text-red-600 font-semibold text-sm hover:bg-red-50 rounded-lg py-2.5 transition"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}