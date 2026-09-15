import "./helpers/env.js";

import assert from "node:assert/strict";
import { test } from "node:test";

import { IMPORT_COLUMNS } from "../src/constants/studentImport.js";
import {
  buildImportPreview,
  buildImportTemplateCsv,
  importStudentsFromFile,
} from "../src/services/studentImport.service.js";
import { ADMISSION_NUMBERING_NOT_READY } from "../src/services/student.service.js";
import { ImportError } from "../src/utils/importError.js";
import { HEADER, csvBuffer, fakeDeps, validStudent, workbookBuffer } from "./helpers/fixtures.js";

const rowByNumber = (preview, rowNumber) =>
  preview.rows.find((row) => row.rowNumber === rowNumber);

test("a valid file previews as importable and inserts nothing", async () => {
  const { deps, calls } = fakeDeps();

  const preview = await buildImportPreview(
    csvBuffer([validStudent(1), validStudent(2), validStudent(3)]),
    "students.csv",
    deps
  );

  assert.equal(preview.canImport, true);
  assert.deepEqual(preview.summary, {
    totalRows: 3,
    validRows: 3,
    invalidRows: 0,
    duplicateRows: 0,
    skippedEmptyRows: 0,
  });
  assert.ok(preview.rows.every((row) => row.status === "valid"));
  assert.equal(calls.find.length, 1, "checks the database once, in a batch");
  assert.equal(calls.insert.length, 0, "preview must never insert");
});

test("an XLSX file previews the same way", async () => {
  const { deps } = fakeDeps();

  const preview = await buildImportPreview(
    workbookBuffer([validStudent(1), validStudent(2)]),
    "students.xlsx",
    deps
  );

  assert.equal(preview.canImport, true);
  assert.equal(preview.summary.totalRows, 2);
});

test("a missing required field and an invalid email make rows invalid", async () => {
  const { deps } = fakeDeps();

  const preview = await buildImportPreview(
    csvBuffer([
      validStudent(1, { full_name: "" }),
      validStudent(2, { email: "nope" }),
      validStudent(3, { department: "Astrology" }),
      validStudent(4),
    ]),
    "students.csv",
    deps
  );

  assert.equal(preview.canImport, false);
  assert.equal(preview.summary.invalidRows, 3);
  assert.equal(preview.summary.validRows, 1);
  assert.equal(rowByNumber(preview, 2).status, "invalid");
  assert.deepEqual(rowByNumber(preview, 2).errors[0], {
    field: "full_name",
    message: "Full name is required",
    type: "validation",
  });
  assert.equal(rowByNumber(preview, 3).errors[0].field, "email");
  assert.equal(rowByNumber(preview, 4).errors[0].field, "department");
});

test("flags duplicate emails within the file, ignoring case", async () => {
  const { deps } = fakeDeps();

  const preview = await buildImportPreview(
    csvBuffer([
      validStudent(1),
      validStudent(2, { email: "Same@Example.com" }),
      validStudent(3, { email: "same@example.com" }),
    ]),
    "students.csv",
    deps
  );

  assert.equal(preview.canImport, false);
  assert.equal(preview.summary.duplicateRows, 2);
  assert.equal(rowByNumber(preview, 3).status, "duplicate");
  assert.match(rowByNumber(preview, 3).errors[0].message, /also used in row 4/);
  assert.match(rowByNumber(preview, 4).errors[0].message, /also used in row 3/);
});

test("flags duplicate application numbers within the file", async () => {
  const { deps } = fakeDeps();

  const preview = await buildImportPreview(
    csvBuffer([
      validStudent(1, { application_number: "APP9" }),
      validStudent(2, { application_number: "APP9" }),
    ]),
    "students.csv",
    deps
  );

  assert.equal(preview.canImport, false);
  assert.deepEqual(
    preview.rows.map((row) => row.errors.map((error) => error.field)),
    [["application_number"], ["application_number"]]
  );
});

test("flags students that already exist in the database", async () => {
  const { deps, calls } = fakeDeps({
    existing: [
      {
        id: "existing-1",
        email: "STUDENT2@example.com",
        application_number: "OTHER",
        admission_number: "ADM/2026/00001",
      },
    ],
  });

  const preview = await buildImportPreview(
    csvBuffer([validStudent(1), validStudent(2)]),
    "students.csv",
    deps
  );

  assert.equal(preview.canImport, false);
  assert.equal(rowByNumber(preview, 2).status, "valid");
  assert.equal(rowByNumber(preview, 3).status, "duplicate");
  assert.match(rowByNumber(preview, 3).errors[0].message, /already belongs to an existing student/);

  // Only the uploaded values are looked up (plus case variants), never the whole table.
  assert.ok(calls.find[0].emails.includes("student2@example.com"));
  assert.ok(calls.find[0].emails.includes("STUDENT2@EXAMPLE.COM"));
  assert.equal("admissionNumbers" in calls.find[0], false);
});

test("a database lookup failure stops the preview with a clear error", async () => {
  const { deps } = fakeDeps({ lookupError: { message: "timeout" } });

  await assert.rejects(
    buildImportPreview(csvBuffer([validStudent(1)]), "students.csv", deps),
    (error) => error instanceof ImportError && error.status === 502
  );
});

test("admission numbers in the file are rejected, not imported", async () => {
  const { deps, calls } = fakeDeps();
  const header = [...HEADER, "admission_number"];
  const file = csvBuffer(
    [validStudent(1, { admission_number: "ADM/2026/00099" }), validStudent(2)],
    header
  );

  const preview = await buildImportPreview(file, "students.csv", deps);

  assert.equal(preview.canImport, false);
  assert.deepEqual(rowByNumber(preview, 2).errors, [
    {
      field: "admission_number",
      message:
        "Admission numbers are generated automatically. Leave this column empty or remove it.",
      type: "validation",
    },
  ]);
  assert.equal(rowByNumber(preview, 3).status, "valid");

  await assert.rejects(
    importStudentsFromFile(file, "students.csv", deps),
    (error) => error instanceof ImportError && error.status === 422
  );
  assert.equal(calls.insert.length, 0);
});

test("a file from the first template with an empty admission_number column still imports", async () => {
  const { deps } = fakeDeps();

  const preview = await buildImportPreview(
    csvBuffer([validStudent(1), validStudent(2)], [...HEADER, "admission_number"]),
    "students.csv",
    deps
  );

  assert.equal(preview.canImport, true);
  assert.deepEqual(preview.ignoredColumns, []);
});

test("import re-validates the file and inserts nothing when it has errors", async () => {
  const { deps, calls } = fakeDeps();

  await assert.rejects(
    importStudentsFromFile(
      csvBuffer([validStudent(1), validStudent(2, { email: "bad" })]),
      "students.csv",
      deps
    ),
    (error) =>
      error instanceof ImportError &&
      error.status === 422 &&
      error.details.summary.invalidRows === 1
  );

  assert.equal(calls.insert.length, 0);
});

test("import re-checks the database instead of trusting an earlier preview", async () => {
  const file = csvBuffer([validStudent(1), validStudent(2)]);

  const before = await buildImportPreview(file, "students.csv", fakeDeps().deps);
  assert.equal(before.canImport, true);

  // Someone adds student2 between the preview and the import.
  const { deps, calls } = fakeDeps({
    existing: [{ id: "x", email: "student2@example.com", application_number: "Z" }],
  });

  await assert.rejects(
    importStudentsFromFile(file, "students.csv", deps),
    (error) => error instanceof ImportError && error.status === 422
  );
  assert.equal(calls.insert.length, 0);
});

test("import sends no admission numbers and returns the ones the database assigned", async () => {
  const { deps, calls } = fakeDeps();

  const result = await importStudentsFromFile(
    csvBuffer([validStudent(1), validStudent(2), validStudent(3, { session: "2025/2026" })]),
    "students.csv",
    deps
  );

  assert.equal(calls.insert.length, 1, "one all-or-nothing insert");

  for (const student of calls.insert[0]) {
    assert.deepEqual(
      Object.keys(student).sort(),
      IMPORT_COLUMNS.map((column) => column.key).sort()
    );
    assert.equal("admission_number" in student, false);
  }

  assert.equal(result.importedCount, 3);
  assert.deepEqual(
    result.students.map((student) => student.admission_number),
    ["ADM/2026/00001", "ADM/2026/00002", "ADM/2026/00003"]
  );
  assert.deepEqual(result.students[0], {
    rowNumber: 2,
    id: "id-0",
    full_name: "Student 1",
    email: "student1@example.com",
    application_number: "APP20260001",
    admission_number: "ADM/2026/00001",
  });
});

test("a unique-constraint clash on email or application number is reported as a 409", async () => {
  const { deps } = fakeDeps({
    insertResult: {
      data: null,
      error: { code: "23505", message: 'duplicate key value violates unique constraint "students_email_key"' },
    },
  });

  await assert.rejects(
    importStudentsFromFile(csvBuffer([validStudent(1)]), "students.csv", deps),
    (error) =>
      error instanceof ImportError &&
      error.status === 409 &&
      /No students were imported/.test(error.message)
  );
});

test("import refuses to run when the database can't generate admission numbers", async () => {
  const { deps } = fakeDeps({
    insertResult: { data: null, error: { code: ADMISSION_NUMBERING_NOT_READY } },
  });

  await assert.rejects(
    importStudentsFromFile(csvBuffer([validStudent(1)]), "students.csv", deps),
    (error) =>
      error instanceof ImportError &&
      error.status === 503 &&
      /no students were imported/.test(error.message)
  );
});

test("the template lists exactly the import columns, without admission_number", () => {
  assert.equal(
    buildImportTemplateCsv(),
    "﻿full_name,email,department,course,mode_of_entry,application_number,session\r\n"
  );
});
