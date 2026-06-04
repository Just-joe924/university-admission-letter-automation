import { useEffect, useState } from "react";
import {
  FileText,
  GraduationCap,
  Plus,
  Users,
  ArrowRight,
} from "lucide-react";

import StatCard from "../../components/dashboard/StatCard";
import DepartmentChart from "../../components/dashboard/DepartmentChart";
import ModeOfEntryChart from "../../components/dashboard/ModeOfEntryChart";

import {
  getDashboardStats,
  getModeOfEntryStats,
  getStudentsByDepartment,
  getRecentStudents,
} from "../../services/dashboardApi";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [modeStats, setModeStats] = useState([]);
  const [departmentStats, setDepartmentStats] = useState([]);
  const [recentStudents, setRecentStudents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const [statsData, modeData, departmentData, recentData] =
          await Promise.all([
            getDashboardStats(),
            getModeOfEntryStats(),
            getStudentsByDepartment(),
            getRecentStudents(),
          ]);

        setStats(statsData);
        setModeStats(modeData);
        setDepartmentStats(departmentData);
        setRecentStudents(recentData);
      } catch (error) {
        console.error("Dashboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboard();
  }, []);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading dashboard...</p>;
  }

  const statCards = [
    {
      title: "Total Students",
      value: stats?.totalStudents,
      icon: Users,
      iconBg: "bg-blue-50 text-black",
    },
    {
      title: "UTME Students",
      value: stats?.utmeStudents,
      icon: GraduationCap,
      iconBg: "bg-green-50 text-black",
    },
    {
      title: "Direct Entry",
      value: stats?.directEntryStudents,
      icon: GraduationCap,
      iconBg: "bg-purple-50 text-black",
    },
    {
      title: "Letters Generated",
      value: stats?.generatedLetters,
      icon: FileText,
      iconBg: "bg-orange-50 text-black",
    },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-1">
            Dashboard Overview
          </h1>
          <p className="text-sm text-slate-600">
            Welcome back! Here's what's happening with your admissions today.
          </p>
        </div>

        <button className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition shrink-0 w-full sm:w-auto">
          <Plus className="w-5 h-5" />
          Add Student
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5 mb-8">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-8">
        <DepartmentChart data={departmentStats} />
        <ModeOfEntryChart data={modeStats} />
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-primary">Recent Admissions</h2>

          <button className="text-primary text-sm font-medium flex items-center gap-1.5 hover:underline">
            View All
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {recentStudents.map((student) => (
            <div
              key={student.id}
              className="border border-slate-100 rounded-xl px-4 py-3 flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-4 min-w-0">
                <div className="w-11 h-11 rounded-full bg-primary text-white flex items-center justify-center text-base shrink-0">
                  {student.full_name?.[0] || "S"}
                </div>

                <div className="min-w-0">
                  <h3 className="text-base font-semibold text-primary truncate">
                    {student.full_name}
                  </h3>
                  <p className="text-sm text-slate-600 truncate">
                    {student.department} - {student.mode_of_entry}
                  </p>
                </div>
              </div>

              <div className="text-right shrink-0">
                <p className="text-sm text-slate-700">
                  {student.admission_number || "Pending"}
                </p>
                <span className="inline-block mt-1.5 px-3 py-0.5 rounded-full bg-green-100 text-green-700 text-xs">
                  Generated
                </span>
              </div>
            </div>
          ))}

          {recentStudents.length === 0 && (
            <p className="text-sm text-slate-500">No recent students found.</p>
          )}
        </div>
      </div>
    </div>
  );
}