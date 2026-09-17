// Statuses and limits for bulk import history. The same status values are
// enforced by CHECK constraints in
// supabase/migrations/20260916090000_student_import_history.sql.

export const IMPORT_STATUSES = {
  PREVIEWED: "previewed",
  PROCESSING: "processing",
  COMPLETED: "completed",
  COMPLETED_WITH_ERRORS: "completed_with_errors",
  FAILED: "failed",
  CANCELLED: "cancelled",
};

export const IMPORT_STATUS_VALUES = Object.values(IMPORT_STATUSES);

export const IMPORT_ROW_STATUSES = {
  VALID: "valid",
  INVALID: "invalid",
  DUPLICATE: "duplicate",
  IMPORTED: "imported",
  FAILED: "failed",
  SKIPPED: "skipped",
};

// Row statuses shown in the error report: everything that was not imported.
export const IMPORT_ROW_PROBLEM_STATUSES = [
  IMPORT_ROW_STATUSES.INVALID,
  IMPORT_ROW_STATUSES.DUPLICATE,
  IMPORT_ROW_STATUSES.FAILED,
  IMPORT_ROW_STATUSES.SKIPPED,
];

export const IMPORT_HISTORY_PAGE_SIZE = 20;
export const IMPORT_ROWS_PAGE_SIZE = 50;
export const IMPORT_MAX_PAGE_SIZE = 100;

// Row records are written in batches so one request never carries 2,000 rows.
export const IMPORT_ROW_INSERT_CHUNK_SIZE = 500;

// Upper bound for a downloaded error report.
export const IMPORT_ERROR_REPORT_MAX_ROWS = 5000;

// Distinct error messages kept in an import's error summary.
export const IMPORT_ERROR_SUMMARY_LIMIT = 10;

// An import still "processing" after this long was interrupted (restart or deploy).
export const IMPORT_STALE_AFTER_MS = 30 * 60 * 1000;
