import { canSeeAllImports } from "../middleware/admin.middleware.js";
import {
  IMPORT_ERROR_REPORT_MAX_ROWS,
  IMPORT_HISTORY_PAGE_SIZE,
  IMPORT_MAX_PAGE_SIZE,
  IMPORT_ROWS_PAGE_SIZE,
  IMPORT_ROW_PROBLEM_STATUSES,
  IMPORT_ROW_STATUSES,
  IMPORT_STATUS_VALUES,
} from "../constants/importStatus.js";
import {
  getImportRecordService,
  listImportRecordsService,
} from "../services/importHistory.service.js";
import {
  getImportRowsForReportService,
  listImportRowsService,
} from "../services/importRow.service.js";
import {
  generateImportErrorCsv,
  importErrorReportFilename,
} from "../utils/generateImportErrorCsv.js";
import {
  buildPagination,
  toImportDetails,
  toImportRow,
  toImportSummary,
} from "../utils/importPresenter.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const ROW_STATUS_VALUES = Object.values(IMPORT_ROW_STATUSES);

export const parsePagination = (query = {}, defaultPageSize = IMPORT_HISTORY_PAGE_SIZE) => {
  const page = Math.max(1, Number.parseInt(query.page, 10) || 1);
  const requested = Number.parseInt(query.pageSize, 10) || defaultPageSize;

  return { page, pageSize: Math.min(Math.max(1, requested), IMPORT_MAX_PAGE_SIZE) };
};

const parseDate = (value) => {
  if (!value) return null;

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
};

// Admins see everything; other roles only see the imports they ran.
const scopeFor = (admin) =>
  canSeeAllImports(admin) ? {} : { adminAuthUserId: admin?.authUserId ?? null };

// Loads an import the caller is allowed to see, responding itself if it can't.
const loadImport = async (req, res) => {
  const { importId } = req.params;

  if (!UUID_PATTERN.test(importId || "")) {
    res.status(400).json({ success: false, message: "Invalid import id." });
    return null;
  }

  const { data, error } = await getImportRecordService(importId, scopeFor(req.admin));

  if (error) {
    console.error("Fetch import error:", error);
    res.status(500).json({ success: false, message: "Failed to load the import." });
    return null;
  }

  if (!data) {
    res.status(404).json({ success: false, message: "Import not found." });
    return null;
  }

  return data;
};

export const listImports = async (req, res) => {
  const { page, pageSize } = parsePagination(req.query, IMPORT_HISTORY_PAGE_SIZE);
  const { status } = req.query;

  if (status && !IMPORT_STATUS_VALUES.includes(status)) {
    return res.status(400).json({ success: false, message: "Unknown import status." });
  }

  const { data, error, count } = await listImportRecordsService({
    page,
    pageSize,
    status,
    search: req.query.search,
    from: parseDate(req.query.from),
    to: parseDate(req.query.to),
    ...scopeFor(req.admin),
  });

  if (error) {
    console.error("List imports error:", error);
    return res.status(500).json({ success: false, message: "Failed to load import history." });
  }

  return res.status(200).json({
    success: true,
    data: (data || []).map((record) => toImportSummary(record)),
    pagination: buildPagination(page, pageSize, count),
  });
};

const respondWithRows = async (req, res, record, statuses) => {
  const { page, pageSize } = parsePagination(req.query, IMPORT_ROWS_PAGE_SIZE);

  const { data, error, count } = await listImportRowsService({
    importId: record.id,
    statuses,
    page,
    pageSize,
  });

  if (error) {
    console.error("List import rows error:", error);
    return res.status(500).json({ success: false, message: "Failed to load the import rows." });
  }

  return res.status(200).json({
    success: true,
    data: {
      import: toImportDetails(record),
      rows: (data || []).map(toImportRow),
      pagination: buildPagination(page, pageSize, count),
    },
  });
};

export const getImportDetails = async (req, res) => {
  const record = await loadImport(req, res);
  if (!record) return undefined;

  const requested = String(req.query.rowStatus || "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => ROW_STATUS_VALUES.includes(value));

  return respondWithRows(req, res, record, requested.length ? requested : undefined);
};

export const getImportErrors = async (req, res) => {
  const record = await loadImport(req, res);
  if (!record) return undefined;

  return respondWithRows(req, res, record, IMPORT_ROW_PROBLEM_STATUSES);
};

export const downloadImportErrors = async (req, res) => {
  const record = await loadImport(req, res);
  if (!record) return undefined;

  // Built entirely from stored row results; the spreadsheet is long gone.
  const { data, error } = await getImportRowsForReportService({
    importId: record.id,
    statuses: IMPORT_ROW_PROBLEM_STATUSES,
    limit: IMPORT_ERROR_REPORT_MAX_ROWS,
  });

  if (error) {
    console.error("Import error report error:", error);
    return res.status(500).json({ success: false, message: "Failed to build the error report." });
  }

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${importErrorReportFilename(record)}"`
  );

  return res.status(200).send(generateImportErrorCsv(data || []));
};
