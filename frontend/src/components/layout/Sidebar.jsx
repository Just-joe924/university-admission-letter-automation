import { NavLink, useNavigate } from "react-router-dom";
import {
  GraduationCap,
  LayoutDashboard,
  Users,
  FileText,
  Mail,
  LogOut,
} from "lucide-react";
import useAuth from "../../hooks/useAuth";

export default function Sidebar() {
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
    <aside className="fixed left-0 top-0 h-screen w-72 bg-white border-r border-slate-200 flex flex-col">
      <div className="px-6 py-6 flex items-center gap-4 border-b border-slate-200">
        <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>

        <div>
          <h1 className="text-xl font-bold text-[#06163d]">FUT Admin</h1>
          <p className="text-sm text-slate-500">Admission Portal</p>
        </div>
      </div>

      <nav className="flex-1 px-4 py-6 space-y-3">
        {links.map((link) => {
          const Icon = link.icon;

          return (
            <NavLink
              key={link.path}
              to={link.path}
              className={({ isActive }) =>
                [
                  "flex items-center gap-4 px-5 py-4 rounded-2xl text-lg font-medium transition-all",
                  isActive
                    ? "bg-primary text-white shadow-lg"
                    : "text-slate-700 hover:bg-slate-100",
                ].join(" ")
              }
            >
              <Icon className="w-6 h-6" />
              {link.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="px-4 py-6 border-t border-slate-200">
        <div className="bg-[#dfe8ff] rounded-2xl px-5 py-5 flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-primary text-white flex items-center justify-center text-xl font-semibold">
            {admin?.full_name?.[0] || admin?.email?.[0] || "A"}
          </div>

          <div>
            <p className="font-semibold text-[#06163d]">
              {admin?.full_name || "Admin User"}
            </p>
            <p className="text-sm text-slate-600">
              {admin?.email || "admin@university.edu"}
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 text-red-600 font-semibold text-lg hover:bg-red-50 rounded-xl py-3 transition"
        >
          <LogOut className="w-6 h-6" />
          Logout
        </button>
      </div>
    </aside>
  );
}