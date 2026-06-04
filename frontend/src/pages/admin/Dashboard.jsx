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
    return <p className="text-lg text-slate-600">Loading dashboard...</p>;
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
      <div className="flex items-start justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold text-primary mb-4">
            Dashboard Overview
          </h1>
          <p className="text-xl text-slate-600">
            Welcome back! Here's what's happening with your admissions today.
          </p>
        </div>

        <button className="h-16 px-8 rounded-2xl bg-primary text-white text-xl font-semibold flex items-center gap-3 hover:bg-secondary transition">
          <Plus className="w-7 h-7" />
          Add Student
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 mb-12">
        {statCards.map((card) => (
          <StatCard key={card.title} {...card} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mb-12">
        <DepartmentChart data={departmentStats} />
        <ModeOfEntryChart data={modeStats} />
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 overflow-hidden">
        <div className="px-8 py-7 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-primary">Recent Admissions</h2>

          <button className="text-primary text-lg font-medium flex items-center gap-2 hover:underline">
            View All
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {recentStudents.map((student) => (
            <div
              key={student.id}
              className="border border-slate-100 rounded-2xl px-6 py-5 flex items-center justify-between"
            >
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-full bg-primary text-white flex items-center justify-center text-2xl">
                  {student.full_name?.[0] || "S"}
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-primary">
                    {student.full_name}
                  </h3>
                  <p className="text-lg text-slate-600">
                    {student.department} - {student.mode_of_entry}
                  </p>
                </div>
              </div>

              <div className="text-right">
                <p className="text-lg text-slate-700">
                  {student.admission_number || "Pending"}
                </p>
                <span className="inline-block mt-2 px-5 py-1 rounded-full bg-green-100 text-green-700 text-sm">
                  Generated
                </span>
              </div>
            </div>
          ))}

          {recentStudents.length === 0 && (
            <p className="text-slate-500">No recent students found.</p>
          )}
        </div>
      </div>
    </div>
  );
}