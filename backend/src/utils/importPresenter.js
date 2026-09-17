import { IMPORT_STALE_AFTER_MS, IMPORT_STATUSES } from "../constants/importStatus.js";

// An import left in "processing" long after it started was interrupted (a
// restart or deploy). It is reported as such rather than being rewritten.
export const isStaleImport = (record, now = Date.now()) =>
  record?.status === IMPORT_STATUSES.PROCESSING &&
  now - new Date(record.created_at).getTime() > IMPORT_STALE_AFTER_MS;

export const toImportSummary = (record, now = Date.now()) => ({
  id: record.id,
  originalFilename: record.original_filename,
  fileType: record.file_type,
  status: record.status,
  interrupted: isStaleImport(record, now),
  totalRows: record.total_rows,
  validRows: record.valid_rows,
  invalidRows: record.invalid_rows,
  duplicateRows: record.duplicate_rows,
  importedRows: record.imported_rows,
  failedRows: record.failed_rows,
  adminName: record.admin_name,
  createdAt: record.created_at,
  completedAt: record.completed_at,
});

export const toImportDetails = (record, now = Date.now()) => ({
  ...toImportSummary(record, now),
  errorSummary: record.error_summary ?? null,
  fileSize: record.metadata?.fileSize ?? null,
});

export const toImportRow = (row) => ({
  rowNumber: row.row_number,
  status: row.status,
  studentId: row.student_id ?? null,
  fullName: row.row_data?.full_name ?? null,
  email: row.email ?? row.row_data?.email ?? null,
  applicationNumber: row.application_number ?? row.row_data?.application_number ?? null,
  department: row.row_data?.department ?? null,
  course: row.row_data?.course ?? null,
  session: row.row_data?.session ?? null,
  errors: row.errors ?? [],
});

export const buildPagination = (page, pageSize, total) => ({
  page,
  pageSize,
  total: total ?? 0,
  totalPages: Math.max(1, Math.ceil((total ?? 0) / pageSize)),
});
