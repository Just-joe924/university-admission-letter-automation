import "./helpers/env.js";

import assert from "node:assert/strict";
import { test } from "node:test";

import { IMPORT_STATUSES } from "../src/constants/importStatus.js";
import { IMPORT_COLUMNS } from "../src/constants/studentImport.js";
import {
  buildImportPreview,
  buildImportTemplateCsv,
  importStudentsFromFile,
  previewImportFile,
} from "../src/services/studentImport.service.js";
import { ADMISSION_NUMBERING_NOT_READY } from "../src/services/student.service.js";
import { ImportError } from "../src/utils/importError.js";
import {
  HEADER,
  csvBuffer,
  fakeDeps,
  testAdmin,
  validStudent,
  workbookBuffer,
} from "./helpers/fixtures.js";

const rowByNumber = (preview, rowNumber) =>
  preview.rows.find((row) => row.rowNumber === rowNumber);

const runImport = (buffer, deps, extra = {}) =>
  importStudentsFromFile(
    { buffer, fileName: "students.csv", admin: testAdmin, ...extra },
    deps
  );

const lastUpdate = (calls) => calls.update[calls.update.length - 1].updates;

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
    runImport(file, deps),
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
    runImport(csvBuffer([validStudent(1), validStudent(2, { email: "bad" })]), deps),
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
    runImport(file, deps),
    (error) => error instanceof ImportError && error.status === 422
  );
  assert.equal(calls.insert.length, 0);
});

test("import sends no admission numbers and returns the ones the database assigned", async () => {
  const { deps, calls } = fakeDeps();

  const result = await runImport(
    csvBuffer([validStudent(1), validStudent(2), validStudent(3, { session: "2025/2026" })]),
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
    runImport(csvBuffer([validStudent(1)]), deps),
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
    runImport(csvBuffer([validStudent(1)]), deps),
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

// ── Import history ───────────────────────────────────────────────────────────

test("a preview records the attempt and returns its import id", async () => {
  const { deps, calls } = fakeDeps();

  const preview = await previewImportFile(
    {
      buffer: csvBuffer([validStudent(1), validStudent(2, { email: "bad" })]),
      fileName: "september.csv",
      admin: testAdmin,
    },
    deps
  );

  assert.equal(preview.importId, "import-1");
  assert.equal(calls.createImport.length, 1);

  const record = calls.createImport[0];
  assert.equal(record.status, IMPORT_STATUSES.PREVIEWED);
  assert.equal(record.original_filename, "september.csv");
  assert.equal(record.file_type, "csv");
  assert.equal(record.admin_id, testAdmin.id);
  assert.equal(record.admin_auth_user_id, testAdmin.authUserId);
  assert.equal(record.admin_name, testAdmin.name);
  assert.equal(record.total_rows, 2);
  assert.equal(record.invalid_rows, 1);

  // A fingerprint and size are kept; the spreadsheet itself is not.
  assert.match(record.metadata.fileHash, /^[0-9a-f]{64}$/);
  assert.ok(record.metadata.fileSize > 0);
  assert.equal("fileContent" in record.metadata, false);
});

test("a successful import is recorded as completed with row results", async () => {
  const { deps, calls } = fakeDeps();

  const result = await runImport(csvBuffer([validStudent(1), validStudent(2)]), deps, {
    importId: "import-9",
  });

  assert.deepEqual(calls.claim[0], {
    importId: "import-9",
    adminAuthUserId: testAdmin.authUserId,
  });
  assert.equal(result.importId, "import-9");

  const updates = lastUpdate(calls);
  assert.equal(updates.status, IMPORT_STATUSES.COMPLETED);
  assert.equal(updates.imported_rows, 2);
  assert.equal(updates.failed_rows, 0);
  assert.equal(updates.total_rows, 2);
  assert.ok(updates.completed_at);

  const savedRows = calls.rows[0];
  assert.equal(savedRows.length, 2);
  assert.deepEqual(savedRows[0], {
    import_id: "import-9",
    row_number: 2,
    status: "imported",
    student_id: "id-0",
    application_number: "APP20260001",
    email: "student1@example.com",
    row_data: null,
    errors: null,
  });
});

test("a file with errors is recorded as failed, with the reasons kept per row", async () => {
  const { deps, calls } = fakeDeps();

  await assert.rejects(
    runImport(
      csvBuffer([
        validStudent(1),
        validStudent(2, { email: "" }),
        validStudent(3, { application_number: "APP20260001" }),
      ]),
      deps
    ),
    (error) => error instanceof ImportError && error.status === 422
  );

  const updates = lastUpdate(calls);
  assert.equal(updates.status, IMPORT_STATUSES.FAILED);
  assert.equal(updates.imported_rows, 0);
  assert.equal(updates.failed_rows, 3);
  assert.equal(updates.error_summary.type, "validation");
  assert.ok(updates.error_summary.topErrors.length > 0);

  const savedRows = calls.rows[0];
  assert.deepEqual(
    savedRows.map((row) => [row.row_number, row.status]),
    [
      [2, "duplicate"],
      [3, "invalid"],
      [4, "duplicate"],
    ]
  );
  // Rows that were not imported keep their values so the report can show them.
  assert.equal(savedRows[1].row_data.full_name, "Student 2");
  assert.equal(savedRows[1].errors[0].field, "email");
});

test("a database failure is recorded as failed, with the rows marked failed", async () => {
  const { deps, calls } = fakeDeps({
    insertResult: {
      data: null,
      error: { code: "23505", message: 'duplicate key value violates unique constraint "students_email_key"' },
    },
  });

  await assert.rejects(runImport(csvBuffer([validStudent(1)]), deps), ImportError);

  const updates = lastUpdate(calls);
  assert.equal(updates.status, IMPORT_STATUSES.FAILED);
  assert.equal(updates.imported_rows, 0);
  assert.equal(updates.error_summary.type, "database");
  assert.equal(updates.error_summary.code, "23505");

  assert.equal(calls.rows[0][0].status, "failed");
  assert.equal(calls.rows[0][0].errors[0].type, "database");
});

test("submitting the same preview twice imports only once", async () => {
  // The claim finds nothing because the first submission already took it.
  const { deps, calls } = fakeDeps({ claimResult: { data: null, error: null } });

  await assert.rejects(
    runImport(csvBuffer([validStudent(1)]), deps, { importId: "import-9" }),
    (error) =>
      error instanceof ImportError &&
      error.status === 409 &&
      /already been submitted/.test(error.message)
  );

  assert.equal(calls.insert.length, 0, "nothing is imported a second time");
  assert.equal(calls.update.length, 0);
});

test("a file that changed after the preview is refused", async () => {
  const { deps, calls } = fakeDeps({
    importRecord: { metadata: { fileHash: "a-different-file" } },
  });

  await assert.rejects(
    runImport(csvBuffer([validStudent(1)]), deps, { importId: "import-9" }),
    (error) =>
      error instanceof ImportError &&
      error.status === 409 &&
      /changed after it was previewed/.test(error.message)
  );

  assert.equal(calls.insert.length, 0);
  assert.equal(lastUpdate(calls).error_summary.type, "file_mismatch");
});

test("import history problems never block a preview or an import", async () => {
  const historyDown = { data: null, error: { message: "relation does not exist" } };
  const { deps, calls } = fakeDeps({ createImportResult: historyDown });

  const preview = await previewImportFile(
    { buffer: csvBuffer([validStudent(1)]), fileName: "students.csv", admin: testAdmin },
    deps
  );
  assert.equal(preview.importId, null);
  assert.equal(preview.canImport, true);

  const result = await runImport(csvBuffer([validStudent(1)]), deps);
  assert.equal(result.importedCount, 1);
  assert.equal(result.importId, null);
  assert.equal(calls.insert.length, 1);
});
