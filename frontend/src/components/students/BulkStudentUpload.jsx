import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CircleCheckBig,
  Download,
  FileSpreadsheet,
  Loader2,
  TriangleAlert,
  Upload,
  X,
} from "lucide-react";

import {
  downloadImportTemplate,
  importStudents,
  previewStudentImport,
} from "../../services/studentImportApi";
import { saveBlob } from "../../utils/downloadFile";
import {
  IMPORT_ACCEPTED_EXTENSIONS,
  IMPORT_MAX_FILE_SIZE_BYTES,
  IMPORT_MAX_ROWS,
  canImportPreview,
  formatFileSize,
  getImportFileError,
} from "../../utils/studentImport";

const PAGE_SIZE = 25;
const MAX_IMPORTED_SHOWN = 10;

const TEMPLATE_COLUMNS = [
  { name: "full_name", hint: "Student's full name" },
  { name: "email", hint: "Valid, unique email address" },
  { name: "department", hint: "As listed in the single-student form" },
  { name: "course", hint: "A course offered by that department" },
  { name: "mode_of_entry", hint: "UTME or Direct Entry" },
  { name: "application_number", hint: "Unique; letters, numbers and / _ . -" },
  { name: "session", hint: "e.g. 2025/2026" },
  { name: "admission_number", hint: "Auto-generated if left blank", optional: true },
];

const PREVIEW_COLUMNS = [
  ["full_name", "Full Name"],
  ["email", "Email"],
  ["department", "Department"],
  ["course", "Course"],
  ["mode_of_entry", "Mode"],
  ["application_number", "Application No."],
  ["session", "Session"],
  ["admission_number", "Admission No."],
];

const STATUS_STYLES = {
  valid: "bg-green-100 text-green-700",
  invalid: "bg-red-100 text-red-700",
  duplicate: "bg-orange-100 text-orange-700",
};

const STATUS_LABELS = {
  valid: "Valid",
  invalid: "Invalid",
  duplicate: "Duplicate",
};

const TILE_TONES = {
  slate: "text-slate-900",
  green: "text-green-600",
  red: "text-red-600",
  orange: "text-orange-600",
};

const plural = (count, word) =>
  `${count.toLocaleString()} ${word}${count === 1 ? "" : "s"}`;

async function getErrorMessage(error, fallback) {
  if (!error.response) {
    return "Could not reach the server. Check your connection and try again.";
  }

  if (error.response.status === 401) {
    return "Your session has expired. Please log in again.";
  }

  let data = error.response.data;

  // Blob requests (the template download) receive their JSON error as a Blob.
  if (data instanceof Blob) {
    try {
      data = JSON.parse(await data.text());
    } catch {
      data = null;
    }
  }

  return data?.message || fallback;
}

export default function BulkStudentUpload() {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null); // "template" | "preview" | "import"
  const [confirming, setConfirming] = useState(false);
  const [problemsOnly, setProblemsOnly] = useState(false);
  const [page, setPage] = useState(1);

  const isBusy = Boolean(busy);
  const importAllowed = canImportPreview(preview);

  const rows = preview?.rows || [];
  const visibleRows = problemsOnly
    ? rows.filter((row) => row.status !== "valid")
    : rows;
  const pageCount = Math.max(1, Math.ceil(visibleRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const firstIndex = (currentPage - 1) * PAGE_SIZE;
  const pageRows = visibleRows.slice(firstIndex, firstIndex + PAGE_SIZE);

  const clearFileInput = () => {
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const clearPreview = () => {
    setPreview(null);
    setConfirming(false);
    setProblemsOnly(false);
    setPage(1);
  };

  const handleReset = () => {
    clearPreview();
    setFile(null);
    setResult(null);
    setError("");
    clearFileInput();
  };

  const handleDownloadTemplate = async () => {
    setError("");

    try {
      setBusy("template");
      const blob = await downloadImportTemplate();
      saveBlob(blob, "student-import-template.csv");
    } catch (err) {
      setError(await getErrorMessage(err, "Failed to download the template."));
    } finally {
      setBusy(null);
    }
  };

  const handleFileChange = (e) => {
    const selected = e.target.files?.[0] || null;

    // A new file invalidates any earlier preview or result.
    clearPreview();
    setResult(null);

    const fileError = selected ? getImportFileError(selected) : "";
    setError(fileError);

    if (fileError) {
      setFile(null);
      clearFileInput();
      return;
    }

    setFile(selected);
  };

  const handlePreview = async () => {
    if (!file) return;

    setError("");
    setResult(null);
    clearPreview();

    try {
      setBusy("preview");
      const data = await previewStudentImport(file);
      setPreview(data);
      setProblemsOnly(!data.canImport);
    } catch (err) {
      setError(await getErrorMessage(err, "Failed to preview the file."));
    } finally {
      setBusy(null);
    }
  };

  const handleImport = async () => {
    if (!file || !importAllowed) return;

    setError("");

    try {
      setBusy("import");
      const data = await importStudents(file);
      clearPreview();
      setFile(null);
      clearFileInput();
      setResult(data);
    } catch (err) {
      // The server re-validates the file. If something changed since the
      // preview (e.g. a student was added meanwhile) it returns a fresh preview.
      const freshPreview = err.response?.data?.preview;
      if (freshPreview) {
        setPreview(freshPreview);
        setProblemsOnly(true);
        setPage(1);
      }

      setError(
        await getErrorMessage(
          err,
          "Failed to import students. No students were imported."
        )
      );
    } finally {
      setBusy(null);
      setConfirming(false);
    }
  };

  const summary = preview?.summary;

  return (
    <div className="max-w-6xl space-y-6">
      <section className="bg-white rounded-2xl shadow-md border border-slate-100 px-5 py-6 sm:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold mb-1">
              Bulk Upload Students
            </h1>
            <p className="text-sm text-slate-600">
              Import many students at once from a CSV or Excel file. Nothing is
              saved until you review the preview and confirm.
            </p>
          </div>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={isBusy}
            className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 flex items-center justify-center gap-2 hover:bg-slate-50 transition shrink-0 disabled:opacity-60"
          >
            {busy === "template" ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Download className="w-5 h-5" />
            )}
            Download Template
          </button>
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-sm font-semibold text-slate-900 mb-3">
            Template columns
          </p>
          <ul className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
            {TEMPLATE_COLUMNS.map((column) => (
              <li key={column.name} className="text-xs text-slate-600">
                <code className="font-mono font-semibold text-slate-900">
                  {column.name}
                </code>
                {column.optional ? " (optional)" : " *"} — {column.hint}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-slate-500">
            Accepted files: {IMPORT_ACCEPTED_EXTENSIONS.join(", ")} · up to{" "}
            {formatFileSize(IMPORT_MAX_FILE_SIZE_BYTES)} and{" "}
            {IMPORT_MAX_ROWS.toLocaleString()} students per file. Only the first
            sheet of a workbook is read.
          </p>
        </div>

        <div className="mt-5">
          <label
            htmlFor="student-import-file"
            className={[
              "flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-4 py-8 text-center transition",
              isBusy
                ? "cursor-not-allowed opacity-60"
                : "cursor-pointer hover:border-primary hover:bg-slate-50",
            ].join(" ")}
          >
            <FileSpreadsheet className="w-8 h-8 text-slate-400" />
            <span className="text-sm font-semibold text-primary">
              {file ? "Choose a different file" : "Choose a spreadsheet"}
            </span>
            <span className="text-xs text-slate-500">CSV, XLSX or XLS</span>
          </label>
          <input
            id="student-import-file"
            ref={fileInputRef}
            type="file"
            accept={IMPORT_ACCEPTED_EXTENSIONS.join(",")}
            onChange={handleFileChange}
            disabled={isBusy}
            className="sr-only"
          />
        </div>

        {file && (
          <div className="mt-4 flex flex-col gap-3 rounded-xl border border-slate-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <FileSpreadsheet className="w-5 h-5 text-green-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">
                  {file.name}
                </p>
                <p className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handlePreview}
                disabled={isBusy}
                className="h-10 flex-1 sm:flex-none px-4 rounded-xl bg-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-primary transition disabled:opacity-60"
              >
                {busy === "preview" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {busy === "preview"
                  ? "Checking file..."
                  : preview
                    ? "Preview Again"
                    : "Upload & Preview"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={isBusy}
                className="h-10 flex-1 sm:flex-none px-4 rounded-xl bg-slate-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-slate-700 transition disabled:opacity-60"
              >
                <X className="w-4 h-4" />
                Cancel
              </button>
            </div>
          </div>
        )}

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}
      </section>

      {result && (
        <section className="bg-white rounded-2xl shadow-md border border-green-200 px-5 py-6 sm:px-8">
          <div className="flex items-start gap-3">
            <CircleCheckBig className="w-6 h-6 text-green-600 shrink-0" />
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-bold text-slate-900">
                {result.message}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Admission letters were not generated. You can generate them
                from the Students page.
              </p>

              <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Row", "Full Name", "Email", "Application No.", "Admission No."].map(
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
                    {result.students.slice(0, MAX_IMPORTED_SHOWN).map((student) => (
                      <tr key={student.rowNumber} className="border-t border-slate-100">
                        <td className="py-2.5 px-3 text-sm text-slate-500">
                          {student.rowNumber}
                        </td>
                        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                          {student.full_name}
                        </td>
                        <td className="py-2.5 px-3 text-sm text-slate-600">
                          {student.email}
                        </td>
                        <td className="py-2.5 px-3 text-sm whitespace-nowrap">
                          {student.application_number}
                        </td>
                        <td className="py-2.5 px-3 text-sm font-medium whitespace-nowrap">
                          {student.admission_number}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {result.students.length > MAX_IMPORTED_SHOWN && (
                <p className="mt-2 text-xs text-slate-500">
                  and {plural(result.students.length - MAX_IMPORTED_SHOWN, "more student")}.
                </p>
              )}

              <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                <button
                  type="button"
                  onClick={() => navigate("/admin/students")}
                  className="h-11 px-5 rounded-xl bg-primary text-white text-sm font-semibold hover:bg-secondary transition"
                >
                  View Students
                </button>
                <button
                  type="button"
                  onClick={handleReset}
                  className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Upload Another File
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {preview && summary && (
        <section className="bg-white rounded-2xl shadow-md border border-slate-100 px-5 py-6 sm:px-8">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">Preview</h2>
            <p className="text-sm text-slate-600 break-words">
              {preview.fileName}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <SummaryTile label="Total rows" value={summary.totalRows} />
            <SummaryTile label="Valid rows" value={summary.validRows} tone="green" />
            <SummaryTile
              label="Invalid rows"
              value={summary.invalidRows}
              tone={summary.invalidRows ? "red" : "slate"}
            />
            <SummaryTile
              label="Duplicate rows"
              value={summary.duplicateRows}
              tone={summary.duplicateRows ? "orange" : "slate"}
            />
          </div>

          <div className="mt-3 space-y-1 text-xs text-slate-500">
            <p>Duplicate rows are also counted as invalid rows.</p>
            {summary.skippedEmptyRows > 0 && (
              <p>{plural(summary.skippedEmptyRows, "empty row")} skipped.</p>
            )}
            {preview.ignoredColumns?.length > 0 && (
              <p>
                Ignored columns that aren't part of the template:{" "}
                {preview.ignoredColumns.join(", ")}.
              </p>
            )}
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={problemsOnly}
                onChange={(e) => {
                  setProblemsOnly(e.target.checked);
                  setPage(1);
                }}
              />
              Show only rows with problems
            </label>
            <p className="text-xs text-slate-500">
              {visibleRows.length === 0
                ? "No rows to show"
                : `Showing ${firstIndex + 1}–${firstIndex + pageRows.length} of ${plural(visibleRows.length, "row")}`}
            </p>
          </div>

          <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left">
              <thead className="bg-slate-50">
                <tr>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-700">Row</th>
                  {PREVIEW_COLUMNS.map(([field, heading]) => (
                    <th
                      key={field}
                      className="py-3 px-3 text-xs font-semibold text-slate-700 whitespace-nowrap"
                    >
                      {heading}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-xs font-semibold text-slate-700">Status</th>
                  <th className="py-3 px-3 text-xs font-semibold text-slate-700">Problems</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((row) => (
                  <tr key={row.rowNumber} className="border-t border-slate-100 align-top">
                    <td className="py-2.5 px-3 text-sm text-slate-500">{row.rowNumber}</td>
                    {PREVIEW_COLUMNS.map(([field]) => (
                      <PreviewCell key={field} row={row} field={field} />
                    ))}
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-3 py-0.5 rounded-full text-xs whitespace-nowrap ${STATUS_STYLES[row.status]}`}
                      >
                        {STATUS_LABELS[row.status]}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-xs min-w-64">
                      {row.errors.length > 0 ? (
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

            {visibleRows.length === 0 && (
              <p className="py-8 text-center text-sm text-slate-500">
                No rows with problems.
              </p>
            )}
          </div>

          {pageCount > 1 && (
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setPage(currentPage - 1)}
                disabled={currentPage === 1}
                className="h-9 px-3 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-600">
                Page {currentPage} of {pageCount}
              </span>
              <button
                type="button"
                onClick={() => setPage(currentPage + 1)}
                disabled={currentPage === pageCount}
                className="h-9 px-3 rounded-lg border border-slate-300 text-sm hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}

          <div className="mt-6 border-t border-slate-200 pt-6">
            {importAllowed ? (
              <div className="flex gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                <TriangleAlert className="w-5 h-5 shrink-0" />
                <p>
                  Importing adds all {plural(summary.totalRows, "student")} at
                  once and can't be undone in one step. To remove them later,
                  each student has to be deleted from the Students page.
                </p>
              </div>
            ) : (
              <div className="flex gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <TriangleAlert className="w-5 h-5 shrink-0" />
                <p>
                  {plural(summary.invalidRows, "row")}{" "}
                  {summary.invalidRows === 1 ? "has" : "have"} problems, so
                  nothing can be imported. Fix them in your spreadsheet, choose
                  the corrected file and preview it again.
                </p>
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              {confirming ? (
                <>
                  <p className="text-sm font-semibold text-slate-900 sm:mr-auto">
                    Import {plural(summary.totalRows, "student")} now?
                  </p>
                  <button
                    type="button"
                    onClick={() => setConfirming(false)}
                    disabled={isBusy}
                    className="h-11 px-5 rounded-xl border border-slate-300 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-60"
                  >
                    Go Back
                  </button>
                  <button
                    type="button"
                    onClick={handleImport}
                    disabled={isBusy || !importAllowed}
                    className="h-11 px-5 rounded-xl bg-green-600 text-white text-sm font-semibold flex items-center justify-center gap-2 hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {busy === "import" && <Loader2 className="w-4 h-4 animate-spin" />}
                    {busy === "import" ? "Importing..." : "Confirm Import"}
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  disabled={isBusy || !importAllowed}
                  className="h-11 px-5 rounded-xl bg-green-600 text-white text-sm font-semibold hover:bg-green-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {importAllowed
                    ? `Import ${plural(summary.totalRows, "Student")}`
                    : "Import Students"}
                </button>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function SummaryTile({ label, value, tone = "slate" }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <p className="text-xs font-semibold text-slate-600">{label}</p>
      <p className={`mt-1 text-2xl font-bold ${TILE_TONES[tone]}`}>
        {value.toLocaleString()}
      </p>
    </div>
  );
}

function PreviewCell({ row, field }) {
  const hasError = row.errors.some((rowError) => rowError.field === field);
  const value = row.data[field];

  return (
    <td
      className={[
        "py-2.5 px-3 text-sm whitespace-nowrap",
        hasError ? "text-red-600 font-medium" : "text-slate-800",
      ].join(" ")}
    >
      {value || (hasError ? "(missing)" : "—")}
    </td>
  );
}
