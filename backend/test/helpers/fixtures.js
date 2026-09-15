import * as XLSX from "xlsx";

export const HEADER = [
  "full_name",
  "email",
  "department",
  "course",
  "mode_of_entry",
  "application_number",
  "session",
  "admission_number",
];

export const validStudent = (n, overrides = {}) => ({
  full_name: `Student ${n}`,
  email: `student${n}@example.com`,
  department: "Computer Science",
  course: "Software Engineering",
  mode_of_entry: "UTME",
  application_number: `APP2026${String(n).padStart(4, "0")}`,
  session: "2026/2027",
  admission_number: "",
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

// In-memory stand-ins for the database calls, recording how they were used.
export const fakeDeps = ({ existing = [], highest = 0, lookupError = null, insertResult } = {}) => {
  const calls = { find: [], highest: [], insert: [] };

  const deps = {
    findExistingStudents: async (query) => {
      calls.find.push(query);
      return lookupError ? { data: null, error: lookupError } : { data: existing, error: null };
    },
    getHighestAdmissionSequence: async (prefix) => {
      calls.highest.push(prefix);
      return typeof highest === "function" ? highest(prefix) : highest;
    },
    insertStudents: async (students) => {
      calls.insert.push(students);
      return (
        insertResult ?? {
          data: students.map((student, i) => ({ id: `id-${i}`, ...student })),
          error: null,
        }
      );
    },
  };

  return { deps, calls };
};
