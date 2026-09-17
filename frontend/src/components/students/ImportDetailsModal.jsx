import { useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";

import {
  downloadImportErrors,
  getImportDetails,
} from "../../services/studentImportApi";
import { saveBlob } from "../../utils/downloadFile";
import {
  IMPORT_ROW_STATUS_STYLES,
  formatDateTime,
  getImportStatusMeta,
  hasImportErrors,
} from "../../utils/importHistory";

const ROWS_PAGE_SIZE = 25;

async function getErrorMessage(error, fallback) {
  if (!error.response) {
    return "Could not reach the server. Check your connection and try again.";
  }

  if (error.response.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  let data = error.response.data;

  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }

  return data?.message || fallback;
}

export default function ImportDetailsModal({ importId, onClose }) {
  const [details, setDetails] = useState(null);
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [page, setPage] = useState(1);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await getImportDetails(importId, {
          page,
          pageSize: ROWS_PAGE_SIZE,
          ...(problemsOnly ? { rowStatus: "invalid,duplicate,failed,skipped" } : {}),
        });

        if (cancelled) return;

        setDetails(data.data.import);
        setRows(data.data.rows);
        setPagination(data.data.pagination);
        setError("");
      } catch (err) {
        if (!cancelled) setError(await getErrorMessage(err, "Failed to load this import."));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [importId, page, problemsOnly]);

  const handleDownload = async () => {
    setError("");

    try {
      setDownloading(true);
      const blob = await downloadImportErrors(importId);
      saveBlob(blob, `${details?.originalFilename || "import"}-errors.csv`);
    } catch (err) {
      setError(await getErrorMessage(err, "Failed to download the error report."));
    } finally {
      setDownloading(false);
    }
  };

  const status = getImportStatusMeta(details);
  const summaryTiles = details
    ? [
        { label: "Total rows", value: details.totalRows },
        { label: "Valid rows", value: details.validRows },
        { label: "Invalid rows", value: details.invalidRows },
        { label: "Duplicate rows", value: details.duplicateRows },
        { label: "Imported", value: details.importedRows },
        { label: "Not imported", value: details.failedRows },
      ]
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4">
          <h2 className="text-lg font-bold text-primary">Import Details</h2>

          <button onClick={onClose} className="rounded-lg p-1 hover:bg-slate-100" aria-label="Close">
            <X className="h-5 w-5 text-slate-900" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-5">
          {loading && <p className="text-sm text-slate-600">Loading import...</p>}

          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          )}

          {details && (
            <>
              <section className="rounded-xl bg-slate-50 p-5">
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-base font-semibold text-slate-950 break-all">
                    {details.originalFilename}
                  </h3>
                  <span className={`rounded-full px-3 py-0.5 text-xs ${status.className}`}>
                    {status.label}
                  </span>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                  <Detail label="Uploaded" value={formatDateTime(details.createdAt)} />
                  <Detail label="Finished" value={formatDateTime(details.completedAt)} />
                  <Detail label="Admin" value={details.adminName || "—"} />
                </div>
              </section>

              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                {summaryTiles.map((tile) => (
                  <div key={tile.label} className="rounded-xl bg-slate-50 p-4">
                    <p className="text-xs font-semibold text-slate-600">{tile.label}</p>
                    <p className="mt-1 text-2xl font-bold text-slate-900">
                      {(tile.value ?? 0).toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>

              {details.interrupted && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  This import never reported a result, usually because the server
                  restarted while it was running. Check the Students page before
                  uploading the file again.
                </div>
              )}

              {details.errorSummary && (
                <section className="rounded-xl border border-red-200 bg-red-50 p-5">
                  <h3 className="text-sm font-semibold text-red-700">
                    {details.errorSummary.message || "The import failed."}
                  </h3>

                  {details.errorSummary.topErrors?.length > 0 && (
                    <ul className="mt-3 space-y-1 text-sm text-red-700">
                      {details.errorSummary.topErrors.map((item, index) => (
                        <li key={index}>
                          {item.message}
                          {item.count > 1 && (
                            <span className="text-red-500"> ({item.count} rows)</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}

                  {details.errorSummary.truncated && (
                    <p className="mt-2 text-xs text-red-600">
                      Download the error report to see every problem.
                    </p>
                  )}
                </section>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={problemsOnly}
                    onChange={(e) => {
                      setProblemsOnly(e.target.checked);
                      setPage(1);
                    }}
                  />
                  Show only rows that were not imported
                </label>

                {hasImportErrors(details) && (
                  <button
                    type="button"
                    onClick={handleDownload}
                    disabled={downloading}
                    className="h-11 px-5 rounded-xl bg-slate-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700 transition disabled:opacity-60"
                  >
                    {downloading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Download Error Report
                  </button>
                )}
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Row", "Full Name", "Email", "Application No.", "Status", "Problems"].map(
                        (heading) => (
                          <th
                            key={heading}
                            className="py-3 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap"
                          >
                            {heading}
                          </th>
                        )
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row.rowNumber} className="border-t border-slate-100 align-top">
                        <td className="py-2.5 px-3 text-sm text-slate-500">{row.rowNumber}</td>
                        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                          {row.fullName || "—"}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-slate-600">{row.email || "—"}</td>
                        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                          {row.applicationNumber || "—"}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-3 py-0.5 rounded-full text-xs capitalize whitespace-nowrap ${
                              IMPORT_ROW_STATUS_STYLES[row.status] || "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {row.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-xs">
                          {row.errors?.length > 0 ? (
                            <ul className="space-y-1">
                              {row.errors.map((rowError, index) => (
                                <li
                                  key={index}
                                  className={
                                    rowError.type === "duplicate"
                                      ? "text-orange-700"
                                      : "text-red-600"
                                  }
                                >
                                  {rowError.message}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {!loading && rows.length === 0 && (
                  <p className="py-8 text-center text-sm text-slate-500">
                    No row results were recorded for this import.
                  </p>
                )}
              </div>

              {pagination && pagination.totalPages > 1 && (
                <div className="flex items-center justify-end gap-2">
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
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="min-w-0">
      <p className="mb-1 text-xs font-semibold text-slate-600">{label}</p>
      <p className="text-sm text-slate-950 break-words">{value}</p>
    </div>
  );
}
