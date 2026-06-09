import { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { getAllEmailLogs } from "../../services/emailLogsApi";
import { getAllStudents } from "../../services/studentApi";

const asArray = (value) =>
  Array.isArray(value) ? value : value?.logs || value?.students || [];

const formatDate = (value) => {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value;
  }
};

const STATUS_STYLES = {
  sent: "bg-green-100 text-green-700",
  failed: "bg-red-100 text-red-700",
  pending: "bg-orange-100 text-orange-700",
};

export default function EmailLogs() {
  const [logs, setLogs] = useState([]);
  const [studentsById, setStudentsById] = useState({});
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    const [logsRes, studentsRes] = await Promise.allSettled([
      getAllEmailLogs(),
      getAllStudents(),
    ]);

    if (logsRes.status === "fulfilled") {
      setLogs(asArray(logsRes.value));
    } else {
      console.error("Email logs error:", logsRes.reason);
    }

    if (studentsRes.status === "fulfilled") {
      const map = {};
      asArray(studentsRes.value).forEach((s) => {
        map[s.id] = s;
      });
      setStudentsById(map);
    }
  };

  useEffect(() => {
    (async () => {
      await loadData();
      setLoading(false);
    })();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const counts = useMemo(() => {
    const c = { total: logs.length, sent: 0, failed: 0, pending: 0 };
    logs.forEach((l) => {
      if (l.status === "sent") c.sent += 1;
      else if (l.status === "failed") c.failed += 1;
      else c.pending += 1;
    });
    return c;
  }, [logs]);

  const filtered = useMemo(() => {
    return logs.filter((log) => {
      const value = search.toLowerCase();
      const studentName = studentsById[log.student_id]?.full_name || "";

      const matchesSearch =
        !value ||
        log.recipient_email?.toLowerCase().includes(value) ||
        log.subject?.toLowerCase().includes(value) ||
        studentName.toLowerCase().includes(value);

      const matchesStatus = !status || log.status === status;

      return matchesSearch && matchesStatus;
    });
  }, [logs, search, status, studentsById]);

  if (loading) {
    return <p className="text-sm text-slate-600">Loading email logs...</p>;
  }

  const summary = [
    { label: "Total Emails", value: counts.total, icon: Mail, color: "bg-blue-50 text-blue-600" },
    { label: "Sent", value: counts.sent, icon: CheckCircle2, color: "bg-green-50 text-green-600" },
    { label: "Failed", value: counts.failed, icon: XCircle, color: "bg-red-50 text-red-600" },
    { label: "Pending", value: counts.pending, icon: Clock, color: "bg-orange-50 text-orange-600" },
  ];

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-1">
            Email Logs
          </h1>
          <p className="text-sm text-slate-600">
            Track every admission letter email and its delivery status.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition shrink-0 w-full sm:w-auto disabled:opacity-60"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {summary.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.label}
              className="bg-white rounded-2xl shadow-md border border-slate-100 p-4 flex items-center gap-3"
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-500 truncate">{item.label}</p>
                <p className="text-xl font-bold text-primary leading-none">
                  {item.value}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <div className="relative sm:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by recipient, student, or subject..."
              className="w-full h-11 rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none focus:border-primary"
            />
          </div>

          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
          >
            <option value="">All Status</option>
            <option value="sent">Sent</option>
            <option value="pending">Pending</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="py-3 px-4 text-sm font-semibold">Recipient</th>
                <th className="py-3 px-4 text-sm font-semibold">Student</th>
                <th className="py-3 px-4 text-sm font-semibold">Subject</th>
                <th className="py-3 px-4 text-sm font-semibold">Status</th>
                <th className="py-3 px-4 text-sm font-semibold">Sent At</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((log) => {
                const studentName =
                  studentsById[log.student_id]?.full_name || "—";

                return (
                  <tr key={log.id} className="border-b border-slate-100 align-top">
                    <td className="py-3 px-4 text-sm whitespace-nowrap">
                      {log.recipient_email}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                      {studentName}
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600">
                      {log.subject}
                      {log.status === "failed" && log.error_message && (
                        <span className="block text-xs text-red-500 mt-0.5">
                          {log.error_message}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={[
                          "px-3 py-0.5 rounded-full text-xs capitalize whitespace-nowrap",
                          STATUS_STYLES[log.status] || "bg-slate-100 text-slate-600",
                        ].join(" ")}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                      {formatDate(log.sent_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <p className="text-center py-8 text-sm text-slate-500">
              No email logs found.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
