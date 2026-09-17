import { setSupabaseHandler } from "./helpers/env.js";

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  downloadImportErrors,
  getImportDetails,
  getImportErrors,
  listImports,
} from "../src/controllers/importHistory.controller.js";
import { createFakeSupabase } from "./helpers/fakeSupabase.js";
import { callController } from "./helpers/http.js";
import { CSV_BOM } from "../src/utils/generateImportErrorCsv.js";

const ADMIN = { id: "admin-1", authUserId: "auth-1", name: "Ada Admin", role: "admin" };
const STAFF = { id: "admin-2", authUserId: "auth-2", name: "Ben Staff", role: "staff" };

const ID = {
  completed: "11111111-1111-4111-8111-111111111111",
  failed: "22222222-2222-4222-8222-222222222222",
  previewed: "33333333-3333-4333-8333-333333333333",
  staff: "44444444-4444-4444-8444-444444444444",
  missing: "55555555-5555-4555-8555-555555555555",
};

const importRecord = (overrides = {}) => ({
  id: ID.completed,
  admin_id: ADMIN.id,
  admin_auth_user_id: ADMIN.authUserId,
  admin_name: ADMIN.name,
  original_filename: "students-september.csv",
  file_type: "csv",
  total_rows: 3,
  valid_rows: 3,
  invalid_rows: 0,
  duplicate_rows: 0,
  imported_rows: 3,
  failed_rows: 0,
  status: "completed",
  error_summary: null,
  metadata: { fileSize: 1024, fileHash: "a".repeat(64) },
  created_at: "2026-09-14T10:00:00.000Z",
  completed_at: "2026-09-14T10:00:05.000Z",
  ...overrides,
});

const rowRecord = (overrides = {}) => ({
  id: `row-${overrides.row_number ?? 2}-${overrides.import_id ?? ID.completed}`,
  import_id: ID.completed,
  row_number: 2,
  status: "imported",
  student_id: "student-1",
  application_number: "APP0001",
  email: "student1@example.com",
  row_data: null,
  errors: null,
  created_at: "2026-09-14T10:00:05.000Z",
  ...overrides,
});

const HISTORY = [
  importRecord(),
  importRecord({
    id: ID.failed,
    original_filename: "students-march.xlsx",
    file_type: "xlsx",
    status: "failed",
    imported_rows: 0,
    failed_rows: 3,
    invalid_rows: 2,
    duplicate_rows: 1,
    error_summary: { type: "validation", message: "The file has rows that could not be imported." },
    created_at: "2026-09-10T08:00:00.000Z",
    completed_at: "2026-09-10T08:00:02.000Z",
  }),
  importRecord({
    id: ID.previewed,
    original_filename: "draft.csv",
    status: "previewed",
    imported_rows: 0,
    completed_at: null,
    created_at: "2026-09-15T09:00:00.000Z",
  }),
  importRecord({
    id: ID.staff,
    admin_id: STAFF.id,
    admin_auth_user_id: STAFF.authUserId,
    admin_name: STAFF.name,
    original_filename: "staff-upload.csv",
    created_at: "2026-09-12T12:00:00.000Z",
  }),
];

const seed = (tables) => {
  const api = createFakeSupabase({ tables });
  setSupabaseHandler(api.handler);
  return api;
};

test("history lists newest first, paginated, hiding unsubmitted previews", async () => {
  seed({ student_imports: HISTORY });

  const first = await callController(listImports, {
    admin: ADMIN,
    query: { pageSize: "2" },
  });

  assert.equal(first.statusCode, 200);
  assert.equal(first.body.success, true);
  assert.deepEqual(first.body.pagination, { page: 1, pageSize: 2, total: 3, totalPages: 2 });
  assert.deepEqual(
    first.body.data.map((record) => record.originalFilename),
    ["students-september.csv", "staff-upload.csv"]
  );
  assert.ok(
    !first.body.data.some((record) => record.status === "previewed"),
    "previews that were never submitted are not history"
  );

  const second = await callController(listImports, {
    admin: ADMIN,
    query: { pageSize: "2", page: "2" },
  });

  assert.equal(second.body.data.length, 1);
  assert.equal(second.body.data[0].originalFilename, "students-march.xlsx");
});

test("history can be filtered by status, filename and date", async () => {
  seed({ student_imports: HISTORY });

  const failed = await callController(listImports, {
    admin: ADMIN,
    query: { status: "failed" },
  });
  assert.deepEqual(
    failed.body.data.map((record) => record.id),
    [ID.failed]
  );

  const previews = await callController(listImports, {
    admin: ADMIN,
    query: { status: "previewed" },
  });
  assert.deepEqual(
    previews.body.data.map((record) => record.id),
    [ID.previewed]
  );

  const searched = await callController(listImports, {
    admin: ADMIN,
    query: { search: "march" },
  });
  assert.deepEqual(
    searched.body.data.map((record) => record.id),
    [ID.failed]
  );

  const dated = await callController(listImports, {
    admin: ADMIN,
    query: { from: "2026-09-11", to: "2026-09-14T23:59:59Z" },
  });
  assert.deepEqual(
    dated.body.data.map((record) => record.id),
    [ID.completed, ID.staff]
  );
});

test("an unknown status filter is rejected", async () => {
  seed({ student_imports: HISTORY });

  const res = await callController(listImports, {
    admin: ADMIN,
    query: { status: "whatever" },
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /Unknown import status/);
});

test("staff only see their own imports; full admins see every import", async () => {
  seed({ student_imports: HISTORY });

  const staffView = await callController(listImports, { admin: STAFF, query: {} });
  assert.deepEqual(
    staffView.body.data.map((record) => record.id),
    [ID.staff]
  );

  const adminView = await callController(listImports, { admin: ADMIN, query: {} });
  assert.equal(adminView.body.data.length, 3);
});

test("import details include the summary and paginated row results", async () => {
  const rows = Array.from({ length: 60 }, (_, i) =>
    rowRecord({ row_number: i + 2, student_id: `student-${i + 1}` })
  );
  seed({ student_imports: HISTORY, student_import_rows: rows });

  const res = await callController(getImportDetails, {
    admin: ADMIN,
    params: { importId: ID.completed },
    query: {},
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.import.originalFilename, "students-september.csv");
  assert.equal(res.body.data.import.adminName, "Ada Admin");
  assert.equal(res.body.data.import.fileSize, 1024);
  assert.equal("fileHash" in res.body.data.import, false, "the file fingerprint stays internal");
  assert.equal(res.body.data.rows.length, 50);
  assert.deepEqual(res.body.data.pagination, {
    page: 1,
    pageSize: 50,
    total: 60,
    totalPages: 2,
  });

  const page2 = await callController(getImportDetails, {
    admin: ADMIN,
    params: { importId: ID.completed },
    query: { page: "2" },
  });
  assert.equal(page2.body.data.rows.length, 10);
  assert.equal(page2.body.data.rows[0].rowNumber, 52);
});

test("an admin cannot open another admin's import", async () => {
  seed({ student_imports: HISTORY });

  const res = await callController(getImportDetails, {
    admin: STAFF,
    params: { importId: ID.completed },
    query: {},
  });

  assert.equal(res.statusCode, 404);
  assert.equal(res.body.success, false);
});

test("import ids are validated before the database is queried", async () => {
  const api = seed({ student_imports: HISTORY });

  const res = await callController(getImportDetails, {
    admin: ADMIN,
    params: { importId: "not-a-uuid" },
    query: {},
  });

  assert.equal(res.statusCode, 400);
  assert.equal(api.state.requests.length, 0);
});

test("a missing import is reported as not found", async () => {
  seed({ student_imports: HISTORY });

  const res = await callController(getImportDetails, {
    admin: ADMIN,
    params: { importId: ID.missing },
    query: {},
  });

  assert.equal(res.statusCode, 404);
});

const FAILED_ROWS = [
  rowRecord({
    import_id: ID.failed,
    row_number: 2,
    status: "invalid",
    student_id: null,
    email: "",
    row_data: { full_name: "No Email", department: "Accounting", course: "Accounting", session: "2026/2027" },
    errors: [{ field: "email", type: "validation", message: "Email is required" }],
  }),
  rowRecord({
    import_id: ID.failed,
    row_number: 3,
    status: "duplicate",
    student_id: null,
    email: "taken@example.com",
    row_data: { full_name: "Taken Email", department: "Accounting", course: "Accounting", session: "2026/2027" },
    errors: [
      { field: "email", type: "duplicate", message: 'Email "taken@example.com" already belongs to an existing student' },
    ],
  }),
  rowRecord({
    import_id: ID.failed,
    row_number: 4,
    status: "skipped",
    student_id: null,
    email: "fine@example.com",
    row_data: { full_name: "Fine Row", department: "Accounting", course: "Accounting", session: "2026/2027" },
    errors: null,
  }),
  rowRecord({ import_id: ID.failed, row_number: 5, status: "imported" }),
];

test("the errors endpoint returns only rows that were not imported", async () => {
  seed({ student_imports: HISTORY, student_import_rows: FAILED_ROWS });

  const res = await callController(getImportErrors, {
    admin: ADMIN,
    params: { importId: ID.failed },
    query: {},
  });

  assert.equal(res.statusCode, 200);
  assert.deepEqual(
    res.body.data.rows.map((row) => [row.rowNumber, row.status]),
    [
      [2, "invalid"],
      [3, "duplicate"],
      [4, "skipped"],
    ]
  );
  assert.equal(res.body.data.rows[0].errors[0].message, "Email is required");
});

test("the error report downloads as a CSV built from stored rows", async () => {
  seed({ student_imports: HISTORY, student_import_rows: FAILED_ROWS });

  const res = await callController(downloadImportErrors, {
    admin: ADMIN,
    params: { importId: ID.failed },
    query: {},
  });

  assert.equal(res.statusCode, 200);
  assert.equal(res.headers["Content-Type"], "text/csv; charset=utf-8");
  assert.equal(
    res.headers["Content-Disposition"],
    'attachment; filename="students-march-errors.csv"'
  );

  // Only the trailing newline is removed: trim() would also eat the BOM.
  const lines = res.body.replace(/\r\n$/, "").split("\r\n");
  assert.ok(lines[0].startsWith(`${CSV_BOM}row_number,status,full_name,email`));
  assert.equal(lines.length, 4, "three problem rows, one line each");
  assert.match(lines[1], /^2,invalid,No Email,,/);
  assert.match(lines[2], /already belongs to an existing student/);
  assert.match(lines[3], /^4,skipped,Fine Row/);
  assert.ok(!res.body.includes("imported"), "imported rows are not in the report");
});
