import * as XLSX from "xlsx";
import * as cptable from "xlsx/dist/cpexcel.full.mjs";

import { IMPORT_COLUMNS, IMPORT_MAX_ROWS } from "../constants/studentImport.js";
import { ImportError } from "./importError.js";

// Code pages let SheetJS decode legacy .xls files and non-UTF-8 CSVs.
XLSX.set_cptable(cptable);

const XLSX_SIGNATURE = [0x50, 0x4b, 0x03, 0x04]; // ZIP container
const XLS_SIGNATURE = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // OLE2 file

const startsWithBytes = (buffer, signature) =>
  buffer.length >= signature.length &&
  signature.every((byte, index) => buffer[index] === byte);

export const getFileExtension = (fileName = "") => {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
};

// "Email Address " -> "email_address", "Course/Programme" -> "course_programme"
export const normalizeHeader = (header) =>
  String(header ?? "")
    .replace(/^\uFEFF/, "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");

const HEADER_TO_FIELD = new Map(
  IMPORT_COLUMNS.flatMap((column) =>
    [column.key, ...column.aliases].map((name) => [name, column.key])
  )
);

const cleanCell = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

// Reject files whose bytes don't match their extension (e.g. a renamed binary),
// so each file is only ever parsed as the format it claims to be.
const assertContentMatchesExtension = (buffer, extension) => {
  const isZip = startsWithBytes(buffer, XLSX_SIGNATURE);
  const isOle = startsWithBytes(buffer, XLS_SIGNATURE);

  if (extension === ".xlsx" && !isZip) {
    throw new ImportError("The file is not a valid .xlsx workbook.");
  }

  if (extension === ".xls" && !isOle) {
    throw new ImportError("The file is not a valid .xls workbook.");
  }

  if (extension === ".csv" && (isZip || isOle || buffer.subarray(0, 8192).includes(0))) {
    throw new ImportError("The file is not a valid CSV text file.");
  }
};

// Parses the first sheet of a CSV/XLSX/XLS buffer into rows keyed by student
// field, with the spreadsheet row number of each. Throws ImportError for files
// that can't be imported at all (unreadable, empty, missing columns, too big).
export const parseSpreadsheet = (buffer, fileName) => {
  if (!buffer?.length) {
    throw new ImportError("The uploaded file is empty.");
  }

  const extension = getFileExtension(fileName);
  assertContentMatchesExtension(buffer, extension);

  let workbook;
  try {
    workbook = XLSX.read(buffer, {
      type: "buffer",
      // Keep CSV cells as text so values like "00123" aren't turned into numbers.
      raw: extension === ".csv",
      dense: true,
      // Stop reading one row past the limit (plus the header) to detect overflow
      // without parsing a huge sheet.
      sheetRows: IMPORT_MAX_ROWS + 2,
      cellFormula: false,
      cellHTML: false,
      cellStyles: false,
    });
  } catch {
    throw new ImportError(
      "The file could not be read. Make sure it is a valid CSV or Excel file."
    );
  }

  const sheet = workbook.Sheets[workbook.SheetNames[0]];

  if (!sheet?.["!ref"]) {
    throw new ImportError(
      "The file is empty. Add a header row and at least one student."
    );
  }

  const firstRowNumber = XLSX.utils.decode_range(sheet["!ref"]).s.r + 1;
  const matrix = XLSX.utils.sheet_to_json(sheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: true,
  });

  const isBlank = (cells) => cells.every((cell) => cleanCell(cell) === "");
  const headerIndex = matrix.findIndex((cells) => !isBlank(cells));

  if (headerIndex === -1) {
    throw new ImportError(
      "The file is empty. Add a header row and at least one student."
    );
  }

  // Counts every row after the header, blank or not, because rows past the
  // sheetRows cap were never read and must not be silently dropped.
  if (matrix.length - headerIndex - 1 > IMPORT_MAX_ROWS) {
    throw new ImportError(
      `The file has more than ${IMPORT_MAX_ROWS.toLocaleString()} rows. Split it into smaller files and upload them one at a time.`
    );
  }

  const columnFields = new Map(); // column index -> student field
  const ignoredColumns = [];
  const repeatedColumns = [];

  matrix[headerIndex].forEach((header, index) => {
    const normalized = normalizeHeader(header);
    if (!normalized) return;

    const field = HEADER_TO_FIELD.get(normalized);
    const original = cleanCell(header);

    if (!field) ignoredColumns.push(original);
    else if ([...columnFields.values()].includes(field)) repeatedColumns.push(original);
    else columnFields.set(index, field);
  });

  if (repeatedColumns.length) {
    throw new ImportError(
      `These columns appear more than once: ${repeatedColumns.join(", ")}. Keep only one of each.`
    );
  }

  const presentFields = new Set(columnFields.values());
  const missingColumns = IMPORT_COLUMNS.filter(
    (column) => column.required && !presentFields.has(column.key)
  ).map((column) => column.key);

  if (missingColumns.length) {
    throw new ImportError(
      `Missing required columns: ${missingColumns.join(", ")}. Download the template to see the expected columns.`
    );
  }

  const rows = [];
  let skippedEmptyRows = 0;

  matrix.slice(headerIndex + 1).forEach((cells, offset) => {
    if (isBlank(cells)) {
      skippedEmptyRows += 1;
      return;
    }

    const data = Object.fromEntries(IMPORT_COLUMNS.map((column) => [column.key, ""]));
    for (const [index, field] of columnFields) {
      data[field] = cleanCell(cells[index]);
    }

    rows.push({
      rowNumber: firstRowNumber + headerIndex + 1 + offset,
      data,
    });
  });

  if (!rows.length) {
    throw new ImportError(
      "The file has no student rows. Add at least one student below the header row."
    );
  }

  return { rows, skippedEmptyRows, ignoredColumns };
};
