import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CSV_BOM,
  generateImportErrorCsv,
  importErrorReportFilename,
} from "../src/utils/generateImportErrorCsv.js";

const row = (overrides = {}) => ({
  row_number: 2,
  status: "invalid",
  application_number: "APP0001",
  email: "student@example.com",
  row_data: {
    full_name: "Ada Obi",
    department: "Accounting",
    course: "Accounting",
    session: "2026/2027",
  },
  errors: [{ field: "email", type: "validation", message: "Email is required" }],
  ...overrides,
});

// Only the trailing newline is removed: trim() would also eat the BOM.
const lines = (csv) => csv.replace(/\r\n$/, "").split("\r\n");

test("the report starts with a header row and a UTF-8 marker", () => {
  const [header] = lines(generateImportErrorCsv([]));

  assert.equal(
    header,
    `${CSV_BOM}row_number,status,full_name,email,application_number,department,course,session,error_field,error_type,error_message`
  );
});

test("each error becomes its own line, keeping the spreadsheet row number", () => {
  const csv = generateImportErrorCsv([
    row({
      errors: [
        { field: "email", type: "validation", message: "Email is required" },
        { field: "course", type: "validation", message: "Course is required" },
      ],
    }),
    row({ row_number: 7, status: "duplicate" }),
  ]);

  const [, first, second, third] = lines(csv);

  assert.match(first, /^2,invalid,Ada Obi,student@example\.com,APP0001,Accounting,Accounting,2026\/2027,email,validation,Email is required$/);
  assert.match(second, /^2,invalid,.*Course is required$/);
  assert.match(third, /^7,duplicate,/);
});

test("a row with no errors still appears once", () => {
  const csv = generateImportErrorCsv([row({ status: "skipped", errors: null })]);

  assert.equal(lines(csv).length, 2);
  assert.match(lines(csv)[1], /^2,skipped,Ada Obi,.*,,,$/);
});

test("values containing commas, quotes or newlines are quoted", () => {
  const csv = generateImportErrorCsv([
    row({
      row_data: { full_name: 'Obi, "Ada"', department: "Law\nSchool" },
      errors: [{ field: "full_name", type: "validation", message: "Bad, name" }],
    }),
  ]);

  const line = lines(csv)[1];
  assert.ok(line.includes('"Obi, ""Ada"""'));
  assert.ok(line.includes('"Law\nSchool"'));
  assert.ok(line.includes('"Bad, name"'));
});

test("values that spreadsheets would run as formulas are stored as text", () => {
  const csv = generateImportErrorCsv([
    row({ row_data: { full_name: "=HYPERLINK(1)" }, errors: [{ message: "+1" }] }),
  ]);

  assert.ok(lines(csv)[1].includes("'=HYPERLINK(1)"));
  assert.ok(lines(csv)[1].includes("'+1"));
});

test("the report is named after the imported file", () => {
  assert.equal(
    importErrorReportFilename({ original_filename: "students september.xlsx" }),
    "students-september-errors.csv"
  );
  assert.equal(importErrorReportFilename({}), "import-errors.csv");
  assert.equal(importErrorReportFilename(null), "import-errors.csv");
});
