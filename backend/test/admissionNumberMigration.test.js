// Runs the real migration SQL against an in-process PostgreSQL (PGlite).
// PGlite has a single connection, so overlapping requests are queued rather
// than truly parallel; the row lock that serializes real concurrent
// transactions can't be exercised here.
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { test } from "node:test";

import { PGlite } from "@electric-sql/pglite";

const migrationFile = new URL(
  "../../supabase/migrations/20260915120000_concurrency_safe_admission_numbers.sql",
  import.meta.url
);
const skip = !existsSync(migrationFile) && "migration file not available";
const MIGRATION = skip ? "" : readFileSync(migrationFile, "utf8");

// The parts of the Supabase schema the migration touches.
const BASE_SCHEMA = `
  create role anon;
  create role authenticated;
  create role service_role;

  create table public.students (
    id uuid primary key default gen_random_uuid(),
    full_name text not null,
    email text not null unique,
    application_number text unique,
    admission_number text,
    session text default '2025/2026',
    created_at timestamptz default now()
  );

  grant select, insert, update, delete on public.students to service_role;
`;

// The real project's four students, including its malformed number and the
// number whose year differs from the session.
const EXISTING = [
  ["Existing A", "a@example.com", "APP1", "ADM/1780741943017", "2025/2026"],
  ["Existing B", "b@example.com", "APP2", "ADM/2026/00004", "2025/2026"],
  ["Existing C", "c@example.com", "APP3", "ADM/2026/00005", "2026/2027"],
  ["Existing D", "d@example.com", "APP4", "ADM/2026/00006", "2026/2027"],
];

const createDatabase = async ({ rows = EXISTING, migrate = true } = {}) => {
  const db = new PGlite();
  await db.exec(BASE_SCHEMA);

  for (const row of rows) {
    await db.query(
      "insert into public.students (full_name, email, application_number, admission_number, session) values ($1, $2, $3, $4, $5)",
      row
    );
  }

  if (migrate) await db.exec(MIGRATION);
  return db;
};

let uniqueId = 0;

const addStudent = async (db, session) => {
  uniqueId += 1;
  const { rows } = await db.query(
    "insert into public.students (full_name, email, application_number, session) values ($1, $2, $3, $4) returning admission_number",
    [`New ${uniqueId}`, `new${uniqueId}@example.com`, `NEW${uniqueId}`, session]
  );
  return rows[0].admission_number;
};

const allNumbers = async (db) =>
  (await db.query("select email, admission_number from public.students order by email")).rows;

test("existing admission numbers are not changed", { skip }, async () => {
  const db = await createDatabase();

  assert.deepEqual(
    (await allNumbers(db)).map((row) => row.admission_number),
    EXISTING.map((row) => row[3])
  );
});

test("a single insert gets the next number for its session year, in the existing format", { skip }, async () => {
  const db = await createDatabase();

  assert.equal(await addStudent(db, "2026/2027"), "ADM/2026/00007");
  assert.equal(await addStudent(db, "2026/2027"), "ADM/2026/00008");
  // Numbering is per year, as before: 2025 has no well-formed numbers yet.
  assert.equal(await addStudent(db, "2025/2026"), "ADM/2025/00001");
});

test("a multi-row insert (bulk import) gives every row a different number", { skip }, async () => {
  const db = await createDatabase();

  const { rows } = await db.query(`
    insert into public.students (full_name, email, application_number, session) values
      ('Bulk 1', 'bulk1@example.com', 'BULK1', '2026/2027'),
      ('Bulk 2', 'bulk2@example.com', 'BULK2', '2026/2027'),
      ('Bulk 3', 'bulk3@example.com', 'BULK3', '2027/2028')
    returning admission_number
  `);

  assert.deepEqual(
    rows.map((row) => row.admission_number),
    ["ADM/2026/00007", "ADM/2026/00008", "ADM/2027/00001"]
  );
});

test("overlapping insert requests all receive unique numbers", { skip }, async () => {
  const db = await createDatabase();

  const numbers = await Promise.all(
    Array.from({ length: 25 }, () => addStudent(db, "2026/2027"))
  );

  assert.equal(new Set(numbers).size, 25);
  assert.deepEqual(
    [...numbers].sort(),
    Array.from({ length: 25 }, (_, i) => `ADM/2026/${String(i + 7).padStart(5, "0")}`)
  );
});

test("a failed insert rolls its numbers back, so a retry neither skips nor reuses one", { skip }, async () => {
  const db = await createDatabase();

  // The second row duplicates an existing email, so the whole statement fails.
  await assert.rejects(
    db.query(`
      insert into public.students (full_name, email, application_number, session) values
        ('Retry 1', 'retry1@example.com', 'RETRY1', '2026/2027'),
        ('Retry 2', 'a@example.com', 'RETRY2', '2026/2027')
    `),
    (error) => error.code === "23505"
  );

  // Retrying the request (fixed) gets fresh numbers starting where it should.
  const { rows } = await db.query(`
    insert into public.students (full_name, email, application_number, session) values
      ('Retry 1', 'retry1@example.com', 'RETRY1', '2026/2027'),
      ('Retry 2', 'retry2@example.com', 'RETRY2', '2026/2027')
    returning admission_number
  `);

  assert.deepEqual(
    rows.map((row) => row.admission_number),
    ["ADM/2026/00007", "ADM/2026/00008"]
  );
});

test("the unique constraint rejects a duplicate admission number", { skip }, async () => {
  const db = await createDatabase();

  await assert.rejects(
    db.query(
      "insert into public.students (full_name, email, admission_number, session) values ('Dup', 'dup@example.com', 'ADM/2026/00005', '2026/2027')"
    ),
    (error) => error.code === "23505" && /admission_number/.test(error.message)
  );
});

test("an explicit number added by an administrator moves the counter past it", { skip }, async () => {
  const db = await createDatabase();

  await db.query(
    "insert into public.students (full_name, email, admission_number, session) values ('Manual', 'manual@example.com', 'ADM/2026/00050', '2026/2027')"
  );

  assert.equal(await addStudent(db, "2026/2027"), "ADM/2026/00051");
});

test("running the migration again changes nothing", { skip }, async () => {
  const db = await createDatabase();
  assert.equal(await addStudent(db, "2026/2027"), "ADM/2026/00007");
  const before = await allNumbers(db);

  await db.exec(MIGRATION);

  assert.deepEqual(await allNumbers(db), before);
  assert.equal(await addStudent(db, "2026/2027"), "ADM/2026/00008");
});

test("the migration stops without making changes when duplicates exist", { skip }, async () => {
  const db = await createDatabase({
    migrate: false,
    rows: [
      ["Dup A", "dupa@example.com", "D1", "ADM/2026/00001", "2026/2027"],
      ["Dup B", "dupb@example.com", "D2", "ADM/2026/00001", "2026/2027"],
    ],
  });

  await assert.rejects(db.exec(MIGRATION), /Duplicate admission numbers must be fixed.*ADM\/2026\/00001 \(2 students\)/);
  await db.exec("rollback");

  const { rows } = await db.query(`
    select to_regclass('public.admission_number_counters') as counters,
           (select count(*) from pg_trigger where tgname = 'students_assign_admission_number')::int as triggers
  `);
  assert.deepEqual(rows[0], { counters: null, triggers: 0 });
  assert.deepEqual(
    (await allNumbers(db)).map((row) => row.admission_number),
    ["ADM/2026/00001", "ADM/2026/00001"]
  );
});

test("sequence numbers past 99999 are not truncated", { skip }, async () => {
  const db = await createDatabase();
  await db.query("update public.admission_number_counters set last_value = 99999 where year = 2026");

  assert.equal(await addStudent(db, "2026/2027"), "ADM/2026/100000");
});

test("an unusable session falls back to the current year", { skip }, async () => {
  const db = await createDatabase();
  const year = new Date().getFullYear();

  assert.equal(await addStudent(db, "unknown"), `ADM/${year}/${year === 2026 ? "00007" : "00001"}`);
});

test("NOT NULL is added only when no student lacks an admission number", { skip }, async () => {
  const nullable = async (db) =>
    (await db.query(
      "select is_nullable from information_schema.columns where table_name = 'students' and column_name = 'admission_number'"
    )).rows[0].is_nullable;

  assert.equal(await nullable(await createDatabase()), "NO");

  const withNull = await createDatabase({
    rows: [...EXISTING, ["No Number", "none@example.com", "APP5", null, "2026/2027"]],
  });
  assert.equal(await nullable(withNull), "YES");
  assert.deepEqual(
    (await withNull.query("select admission_number from public.students where email = 'none@example.com'")).rows,
    [{ admission_number: null }],
    "existing rows are left unchanged"
  );
});

test("the backend role can create students and check readiness, but not call numbering functions", { skip }, async () => {
  const db = await createDatabase();

  await db.exec("set role service_role");
  assert.equal(await addStudent(db, "2026/2027"), "ADM/2026/00007");
  assert.deepEqual(
    (await db.query("select public.admission_numbering_ready() as ready")).rows,
    [{ ready: true }]
  );
  await assert.rejects(
    db.query("select public.next_admission_sequence(2026)"),
    (error) => error.code === "42501"
  );
  await db.exec("reset role");

  await db.exec("set role anon");
  await assert.rejects(
    db.query("select public.admission_numbering_ready()"),
    (error) => error.code === "42501"
  );
  await assert.rejects(
    db.query("select * from public.admission_number_counters"),
    (error) => error.code === "42501"
  );
  await db.exec("reset role");
});

test("readiness reports false when the trigger is disabled", { skip }, async () => {
  const db = await createDatabase();

  await db.exec("alter table public.students disable trigger students_assign_admission_number");

  assert.deepEqual(
    (await db.query("select public.admission_numbering_ready() as ready")).rows,
    [{ ready: false }]
  );
});
