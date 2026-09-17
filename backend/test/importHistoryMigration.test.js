// Runs the import history migration against an in-process PostgreSQL (PGlite)
// to check the constraints, indexes and cascades it creates.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const migrationFile = new URL(
  "../../supabase/migrations/20260916090000_student_import_history.sql",
  import.meta.url
);
const skip = !existsSync(migrationFile) && "migration file not available";
const MIGRATION = skip ? "" : readFileSync(migrationFile, "utf8");

// The parts of the Supabase schema the migration refers to.
const BASE_SCHEMA = `
  create role anon;
  create role authenticated;
  create role service_role;

  create table public.admins (
    id uuid primary key default gen_random_uuid(),
    full_name text,
    email text,
    role text
  );

  create table public.students (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text unique,
    admission_number text
  );

  grant select, insert, update, delete on public.admins, public.students to service_role;
`;

const createDatabase = async () => {
  const db = new PGlite();
  await db.exec(BASE_SCHEMA);
  await db.exec(MIGRATION);
  return db;
};

const insertImport = async (db, { adminId = null, status = "completed" } = {}) => {
  const { rows } = await db.query(
    `insert into public.student_imports (admin_id, admin_name, original_filename, status, total_rows, imported_rows)
     values ($1, 'Ada Admin', 'students.csv', $2, 3, 3) returning id`,
    [adminId, status]
  );
  return rows[0].id;
};

test("creates both tables with the documented indexes", { skip }, async () => {
  const db = await createDatabase();

  const { rows } = await db.query(`
    select indexname from pg_indexes
    where tablename in ('student_imports', 'student_import_rows')
    order by indexname
  `);

  const names = rows.map((row) => row.indexname);
  for (const expected of [
    "student_imports_created_at_idx",
    "student_imports_admin_id_idx",
    "student_imports_admin_auth_user_id_idx",
    "student_imports_status_idx",
    "student_import_rows_import_id_idx",
    "student_import_rows_status_idx",
    "student_import_rows_import_id_row_number_idx",
  ]) {
    assert.ok(names.includes(expected), expected);
  }
});

test("only the documented import statuses are allowed", { skip }, async () => {
  const db = await createDatabase();

  for (const status of [
    "previewed",
    "processing",
    "completed",
    "completed_with_errors",
    "failed",
    "cancelled",
  ]) {
    await insertImport(db, { status });
  }

  await assert.rejects(
    insertImport(db, { status: "half-done" }),
    (error) => error.code === "23514"
  );
});

test("only the documented row statuses and positive row numbers are allowed", { skip }, async () => {
  const db = await createDatabase();
  const importId = await insertImport(db);

  for (const status of ["valid", "invalid", "duplicate", "imported", "failed", "skipped"]) {
    await db.query(
      "insert into public.student_import_rows (import_id, row_number, status) values ($1, $2, $3)",
      [importId, Math.floor(Math.random() * 100000) + 2, status]
    );
  }

  await assert.rejects(
    db.query(
      "insert into public.student_import_rows (import_id, row_number, status) values ($1, 2, 'unknown')",
      [importId]
    ),
    (error) => error.code === "23514"
  );

  await assert.rejects(
    db.query(
      "insert into public.student_import_rows (import_id, row_number, status) values ($1, 0, 'valid')",
      [importId]
    ),
    (error) => error.code === "23514"
  );
});

test("a row number can only appear once per import", { skip }, async () => {
  const db = await createDatabase();
  const importId = await insertImport(db);

  await db.query(
    "insert into public.student_import_rows (import_id, row_number, status) values ($1, 2, 'imported')",
    [importId]
  );

  await assert.rejects(
    db.query(
      "insert into public.student_import_rows (import_id, row_number, status) values ($1, 2, 'imported')",
      [importId]
    ),
    (error) => error.code === "23505"
  );
});

test("deleting an import removes its row results", { skip }, async () => {
  const db = await createDatabase();
  const importId = await insertImport(db);

  await db.query(
    "insert into public.student_import_rows (import_id, row_number, status) values ($1, 2, 'imported')",
    [importId]
  );
  await db.query("delete from public.student_imports where id = $1", [importId]);

  const { rows } = await db.query("select count(*)::int as total from public.student_import_rows");
  assert.equal(rows[0].total, 0);
});

test("history survives deleting the admin or an imported student", { skip }, async () => {
  const db = await createDatabase();

  const { rows: admins } = await db.query(
    "insert into public.admins (full_name, email, role) values ('Ada Admin', 'ada@example.com', 'admin') returning id"
  );
  const importId = await insertImport(db, { adminId: admins[0].id });

  const { rows: students } = await db.query(
    "insert into public.students (full_name, email) values ('Ada Obi', 'ada.obi@example.com') returning id"
  );
  await db.query(
    "insert into public.student_import_rows (import_id, row_number, status, student_id) values ($1, 2, 'imported', $2)",
    [importId, students[0].id]
  );

  await db.query("delete from public.admins where id = $1", [admins[0].id]);
  await db.query("delete from public.students where id = $1", [students[0].id]);

  const { rows } = await db.query(
    `select i.admin_id, i.admin_name, r.student_id, r.row_number
     from public.student_imports i join public.student_import_rows r on r.import_id = i.id
     where i.id = $1`,
    [importId]
  );

  assert.deepEqual(rows[0], {
    admin_id: null,
    admin_name: "Ada Admin",
    student_id: null,
    row_number: 2,
  });
});

test("the API roles cannot read import history directly", { skip }, async () => {
  const db = await createDatabase();

  const { rows } = await db.query(`
    select
      (select relrowsecurity from pg_class where oid = 'public.student_imports'::regclass) as imports_rls,
      (select relrowsecurity from pg_class where oid = 'public.student_import_rows'::regclass) as rows_rls,
      has_table_privilege('anon', 'public.student_imports', 'select') as anon_select,
      has_table_privilege('authenticated', 'public.student_import_rows', 'select') as authenticated_select
  `);

  assert.deepEqual(rows[0], {
    imports_rls: true,
    rows_rls: true,
    anon_select: false,
    authenticated_select: false,
  });
});

test("running the migration again keeps existing history", { skip }, async () => {
  const db = await createDatabase();
  const importId = await insertImport(db);

  await db.exec(MIGRATION);

  const { rows } = await db.query(
    "select original_filename, status from public.student_imports where id = $1",
    [importId]
  );
  assert.deepEqual(rows, [{ original_filename: "students.csv", status: "completed" }]);
});
