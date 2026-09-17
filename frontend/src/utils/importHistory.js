// Shared helpers for the import history screens. Status values match the
// database constraint in
// supabase/migrations/20260916090000_student_import_history.sql.

export const IMPORT_STATUS_META = {
  previewed: { label: "Previewed", className: "bg-slate-100 text-slate-600" },
  processing: { label: "Importing", className: "bg-blue-100 text-blue-700" },
  completed: { label: "Completed", className: "bg-green-100 text-green-700" },
  completed_with_errors: {
    label: "Completed with errors",
    className: "bg-amber-100 text-amber-700",
  },
  failed: { label: "Failed", className: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelled", className: "bg-slate-100 text-slate-600" },
};

export const IMPORT_STATUS_FILTERS = [
  { value: "", label: "All statuses" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "completed_with_errors", label: "Completed with errors" },
  { value: "processing", label: "Importing" },
  { value: "previewed", label: "Previewed only" },
];

export const getImportStatusMeta = (record) => {
  if (record?.interrupted) {
    return { label: "Interrupted", className: "bg-amber-100 text-amber-700" };
  }

  return (
    IMPORT_STATUS_META[record?.status] || {
      label: record?.status || "Unknown",
      className: "bg-slate-100 text-slate-600",
    }
  );
};

export const IMPORT_ROW_STATUS_STYLES = {
  imported: "bg-green-100 text-green-700",
  valid: "bg-green-100 text-green-700",
  invalid: "bg-red-100 text-red-700",
  failed: "bg-red-100 text-red-700",
  duplicate: "bg-orange-100 text-orange-700",
  skipped: "bg-slate-100 text-slate-600",
};

export const formatDateTime = (value) => {
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

// An import has something to download only when rows were not imported.
export const hasImportErrors = (record) =>
  Boolean(record) &&
  (record.failedRows || 0) + (record.invalidRows || 0) + (record.duplicateRows || 0) > 0;

// One click, one import: the button is only live for a clean preview with
// nothing already in flight and nothing already submitted.
export const canSubmitImport = ({ busy, importAllowed, submitted } = {}) =>
  Boolean(importAllowed) && !busy && !submitted;

// Drops empty filters so the request URL only carries what was set.
export const buildHistoryParams = ({ page, pageSize, status, search, from, to } = {}) =>
  Object.fromEntries(
    Object.entries({ page, pageSize, status, search, from, to }).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  );
