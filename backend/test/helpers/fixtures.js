import * as XLSX from "xlsx";

export const HEADER = [
  "full_name",
  "email",
  "department",
  "course",
  "mode_of_entry",
  "application_number",
  "session",
];

// The admin identity the auth middleware puts on the request.
export const testAdmin = {
  id: "admin-1",
  authUserId: "auth-user-1",
  name: "Ada Admin",
  email: "ada@example.com",
  role: "admin",
};

export const validStudent = (n, overrides = {}) => ({
  full_name: `Student ${n}`,
  email: `student${n}@example.com`,
  department: "Computer Science",
  course: "Software Engineering",
  mode_of_entry: "UTME",
  application_number: `APP2026${String(n).padStart(4, "0")}`,
  session: "2026/2027",
  ...overrides,
});

export const toCsv = (students, header = HEADER) =>
  [header.join(","), ...students.map((s) => header.map((h) => s[h] ?? "").join(","))].join(
    "\r\n"
  ) + "\r\n";

export const csvBuffer = (students, header) => Buffer.from(toCsv(students, header), "utf8");

export const workbookBuffer = (students, bookType = "xlsx", header = HEADER) => {
  const sheet = XLSX.utils.aoa_to_sheet([
    header,
    ...students.map((s) => header.map((h) => s[h] ?? "")),
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Students");

  return XLSX.write(workbook, { type: "buffer", bookType });
};

// In-memory stand-ins for the import's database calls, recording how they were
// used. Inserted students get admission numbers the way the database assigns
// them, and import history calls are captured for assertions.
export const fakeDeps = ({
  existing = [],
  lookupError = null,
  insertResult,
  claimResult,
  createImportResult,
  importRecord = {},
} = {}) => {
  const calls = { find: [], insert: [], createImport: [], claim: [], update: [], rows: [] };

  const deps = {
    findExistingStudents: async (query) => {
      calls.find.push(query);
      return lookupError ? { data: null, error: lookupError } : { data: existing, error: null };
    },
    insertStudents: async (students) => {
      calls.insert.push(students);
      return (
        insertResult ?? {
          data: students.map((student, i) => ({
            id: `id-${i}`,
            ...student,
            admission_number: `ADM/2026/${String(i + 1).padStart(5, "0")}`,
          })),
          error: null,
        }
      );
    },
    createImportRecord: async (payload) => {
      calls.createImport.push(payload);
      return (
        createImportResult ?? {
          data: { id: "import-1", ...payload, ...importRecord },
          error: null,
        }
      );
    },
    claimImport: async (query) => {
      calls.claim.push(query);
      return (
        claimResult ?? {
          data: { id: query.importId, status: "processing", metadata: {}, ...importRecord },
          error: null,
        }
      );
    },
    updateImport: async (importId, updates) => {
      calls.update.push({ importId, updates });
      return { data: { id: importId, ...updates }, error: null };
    },
    saveImportRows: async (rows) => {
      calls.rows.push(rows);
      return { error: null };
    },
  };

  return { deps, calls };
};
