// Byte order mark: makes Excel open the file as UTF-8.
export const CSV_BOM = String.fromCharCode(0xfeff);

const COLUMNS = [
  "row_number",
  "status",
  "full_name",
  "email",
  "application_number",
  "department",
  "course",
  "session",
  "error_field",
  "error_type",
  "error_message",
];

// Spreadsheet apps execute cells that start with these, so the value is quoted
// as text instead.
const escapeCell = (value) => {
  const text = value === null || value === undefined ? "" : String(value);
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;

  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const rowLine = (values) => values.map(escapeCell).join(",");

// Builds the error report from stored row results: one line per error, so a row
// with three problems is three lines with the same spreadsheet row number.
// Contains only the fields needed to fix the file and re-upload it.
export const generateImportErrorCsv = (rows = []) => {
  const lines = [rowLine(COLUMNS)];

  for (const row of rows) {
    const shared = [
      row.row_number,
      row.status,
      row.row_data?.full_name ?? "",
      row.email ?? row.row_data?.email ?? "",
      row.application_number ?? row.row_data?.application_number ?? "",
      row.row_data?.department ?? "",
      row.row_data?.course ?? "",
      row.row_data?.session ?? "",
    ];

    const errors = Array.isArray(row.errors) ? row.errors : [];

    if (errors.length === 0) {
      lines.push(rowLine([...shared, "", "", ""]));
      continue;
    }

    for (const error of errors) {
      lines.push(
        rowLine([...shared, error.field ?? "", error.type ?? "", error.message ?? ""])
      );
    }
  }

  return `${CSV_BOM}${lines.join("\r\n")}\r\n`;
};

export const importErrorReportFilename = (record) => {
  const base = String(record?.original_filename || "import")
    .replace(/\.[^.]+$/, "")
    .replace(/[^\w.-]+/g, "-")
    .slice(0, 60);

  return `${base || "import"}-errors.csv`;
};
