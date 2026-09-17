import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Eye, Loader2, RefreshCw, Search, Upload } from "lucide-react";

import ImportDetailsModal from "../../components/students/ImportDetailsModal";
import { getImportHistory } from "../../services/studentImportApi";
import {
  IMPORT_STATUS_FILTERS,
  buildHistoryParams,
  formatDateTime,
  getImportStatusMeta,
} from "../../utils/importHistory";

const PAGE_SIZE = 20;

async function getErrorMessage(error) {
  if (!error.response) {
    return "Could not reach the server. Check your connection and try again.";
  }

  if (error.response.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  return error.response.data?.message || "Failed to load import history.";
}

export default function ImportHistory() {
  const navigate = useNavigate();

  const [imports, setImports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [selectedImportId, setSelectedImportId] = useState(null);
  const [reloadToken, setReloadToken] = useState(0);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const response = await getImportHistory(
          buildHistoryParams({ page, pageSize: PAGE_SIZE, status, search: appliedSearch })
        );

        if (cancelled) return;

        setImports(response.data);
        setPagination(response.pagination);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setImports([]);
          setError(await getErrorMessage(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [page, status, appliedSearch, reloadToken]);

  const handleRefresh = () => {
    setRefreshing(true);
    setReloadToken((token) => token + 1);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setAppliedSearch(search.trim());
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-primary mb-1">
            Import History
          </h1>
          <p className="text-sm text-slate-600">
            Every bulk student upload, who ran it, and what happened to each row.
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-50 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>

          <button
            onClick={() => navigate("/admin/students/add")}
            className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-secondary transition"
          >
            <Upload className="w-4 h-4" />
            New Import
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-100 p-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <form onSubmit={handleSearch} className="relative sm:col-span-2">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by file name, then press Enter"
              className="w-full h-11 rounded-xl border border-slate-300 pl-11 pr-4 text-sm outline-none focus:border-primary"
            />
          </form>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="h-11 rounded-xl border border-slate-300 px-4 text-sm outline-none focus:border-primary"
          >
            {IMPORT_STATUS_FILTERS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {loading ? (
          <p className="flex items-center gap-2 py-8 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading import history...
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-200">
                  {["File", "Date", "Admin", "Total", "Imported", "Failed", "Status", "Actions"].map(
                    (heading) => (
                      <th key={heading} className="py-3 px-4 text-sm font-semibold whitespace-nowrap">
                        {heading}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody>
                {imports.map((record) => {
                  const statusMeta = getImportStatusMeta(record);

                  return (
                    <tr key={record.id} className="border-b border-slate-100">
                      <td className="py-3 px-4 text-sm font-medium break-all">
                        {record.originalFilename}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatDateTime(record.createdAt)}
                      </td>
                      <td className="py-3 px-4 text-sm text-slate-600 whitespace-nowrap">
                        {record.adminName || "—"}
                      </td>
                      <td className="py-3 px-4 text-sm">{record.totalRows}</td>
                      <td className="py-3 px-4 text-sm text-green-700">{record.importedRows}</td>
                      <td className="py-3 px-4 text-sm text-red-600">{record.failedRows}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-3 py-0.5 rounded-full text-xs whitespace-nowrap ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => setSelectedImportId(record.id)}
                          title="View details"
                          className="flex items-center gap-1.5 text-sm text-blue-600 hover:underline"
                        >
                          <Eye className="w-4 h-4" />
                          Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {imports.length === 0 && !error && (
              <div className="py-10 text-center">
                <p className="text-sm text-slate-600">No imports yet.</p>
                <button
                  onClick={() => navigate("/admin/students/add")}
                  className="mt-3 text-sm font-semibold text-blue-600 hover:underline"
                >
                  Upload a student spreadsheet
                </button>
              </div>
            )}
          </div>
        )}

        {pagination && pagination.totalPages > 1 && (
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {pagination.total.toLocaleString()} imports
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="h-9 px-3 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="h-9 px-3 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {selectedImportId && (
        <ImportDetailsModal
          importId={selectedImportId}
          onClose={() => setSelectedImportId(null)}
        />
      )}
    </div>
  );
}
