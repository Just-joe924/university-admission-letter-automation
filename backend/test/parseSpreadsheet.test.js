import "./helpers/env.js";

import assert from "node:assert/strict";
import { test } from "node:test";

import { IMPORT_MAX_ROWS } from "../src/constants/studentImport.js";
import { ImportError } from "../src/utils/importError.js";
import { normalizeHeader, parseSpreadsheet } from "../src/utils/parseSpreadsheet.js";
import { csvBuffer, validStudent, workbookBuffer } from "./helpers/fixtures.js";

const assertImportError = (fn, pattern) =>
  assert.throws(fn, (error) => error instanceof ImportError && pattern.test(error.message));

test("parses a valid CSV with multiple students", () => {
  const { rows, skippedEmptyRows } = parseSpreadsheet(
    csvBuffer([validStudent(1), validStudent(2), validStudent(3)]),
    "students.csv"
  );

  assert.equal(rows.length, 3);
  assert.deepEqual(rows.map((row) => row.rowNumber), [2, 3, 4]);
  assert.equal(rows[1].data.email, "student2@example.com");
  assert.equal(rows[1].data.session, "2026/2027");
  assert.equal(skippedEmptyRows, 0);
});

test("parses a valid XLSX with multiple students", () => {
  const { rows } = parseSpreadsheet(
    workbookBuffer([validStudent(1), validStudent(2)]),
    "students.xlsx"
  );

  assert.equal(rows.length, 2);
  assert.deepEqual(rows[0].data, {
    ...validStudent(1),
    admission_number: "",
  });
});

test("parses a legacy XLS workbook", () => {
  const { rows } = parseSpreadsheet(
    workbookBuffer([validStudent(1), validStudent(2)], "biff8"),
    "students.xls"
  );

  assert.equal(rows.length, 2);
  assert.equal(rows[1].data.application_number, "APP20260002");
});

test("keeps CSV values as text so leading zeros survive", () => {
  const { rows } = parseSpreadsheet(
    csvBuffer([validStudent(1, { application_number: "000123" })]),
    "students.csv"
  );

  assert.equal(rows[0].data.application_number, "000123");
});

test("accepts friendly header names and reports unknown columns", () => {
  const header = [
    "Full Name",
    "Email Address",
    "Department",
    "Course/Programme",
    "Mode of Entry",
    "Application No",
    "Session",
    "Phone",
  ];
  const csv = `${header.join(",")}\r\nAda Obi,ada@example.com,Accounting,Accounting,UTME,APP1,2025/2026,0800\r\n`;

  const { rows, ignoredColumns } = parseSpreadsheet(Buffer.from(csv), "students.csv");

  assert.equal(rows[0].data.full_name, "Ada Obi");
  assert.equal(rows[0].data.course, "Accounting");
  assert.equal(rows[0].data.application_number, "APP1");
  assert.equal(rows[0].data.admission_number, "");
  assert.deepEqual(ignoredColumns, ["Phone"]);
});

test("skips blank rows but keeps the real spreadsheet row numbers", () => {
  const csv = [
    "full_name,email,department,course,mode_of_entry,application_number,session",
    "A,a@example.com,Accounting,Accounting,UTME,APP1,2025/2026",
    ",,,,,,",
    "B,b@example.com,Accounting,Accounting,UTME,APP2,2025/2026",
  ].join("\n");

  const { rows, skippedEmptyRows } = parseSpreadsheet(Buffer.from(csv), "students.csv");

  assert.deepEqual(rows.map((row) => row.rowNumber), [2, 4]);
  assert.equal(skippedEmptyRows, 1);
});

test("rejects a file missing required columns", () => {
  const header = ["full_name", "department", "course", "mode_of_entry", "application_number", "session"];

  assertImportError(
    () => parseSpreadsheet(csvBuffer([validStudent(1)], header), "students.csv"),
    /Missing required columns: email/
  );
});

test("rejects repeated columns", () => {
  const csv = "full_name,email,Email Address,department,course,mode_of_entry,application_number,session\r\n";

  assertImportError(() => parseSpreadsheet(Buffer.from(csv), "students.csv"), /more than once/);
});

test("rejects an empty file", () => {
  assertImportError(() => parseSpreadsheet(Buffer.alloc(0), "students.csv"), /empty/);
});

test("rejects a spreadsheet with only blank lines", () => {
  assertImportError(() => parseSpreadsheet(Buffer.from("\r\n\r\n"), "students.csv"), /empty/);
});

test("rejects a spreadsheet with a header but no students", () => {
  assertImportError(
    () => parseSpreadsheet(csvBuffer([]), "students.csv"),
    /no student rows/
  );
  assertImportError(
    () => parseSpreadsheet(workbookBuffer([]), "students.xlsx"),
    /no student rows/
  );
});

test("accepts exactly the maximum number of rows", () => {
  const students = Array.from({ length: IMPORT_MAX_ROWS }, (_, i) => validStudent(i + 1));

  const { rows } = parseSpreadsheet(csvBuffer(students), "students.csv");

  assert.equal(rows.length, IMPORT_MAX_ROWS);
});

test("rejects files with more rows than the limit", () => {
  const students = Array.from({ length: IMPORT_MAX_ROWS + 1 }, (_, i) => validStudent(i + 1));

  assertImportError(
    () => parseSpreadsheet(csvBuffer(students), "students.csv"),
    /more than 2,000 rows/
  );
  assertImportError(
    () => parseSpreadsheet(workbookBuffer(students), "students.xlsx"),
    /more than 2,000 rows/
  );
});

test("rejects content that doesn't match the file extension", () => {
  assertImportError(
    () => parseSpreadsheet(csvBuffer([validStudent(1)]), "students.xlsx"),
    /not a valid \.xlsx/
  );
  assertImportError(
    () => parseSpreadsheet(workbookBuffer([validStudent(1)]), "students.csv"),
    /not a valid CSV/
  );
  assertImportError(
    () => parseSpreadsheet(workbookBuffer([validStudent(1)]), "students.xls"),
    /not a valid \.xls/
  );
});

test("normalizes header spellings", () => {
  assert.equal(normalizeHeader("\uFEFF Email Address "), "email_address");
  assert.equal(normalizeHeader("Course/Programme"), "course_programme");
  assert.equal(normalizeHeader("Application No."), "application_no");
});
