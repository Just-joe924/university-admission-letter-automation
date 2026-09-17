import { setSupabaseHandler } from "./helpers/env.js";

import assert from "node:assert/strict";
import { test } from "node:test";

import { createStudent, updateStudent } from "../src/controllers/student.controller.js";
import {
  createStudentsService,
  getStudentByIdService,
} from "../src/services/student.service.js";
import { importStudentsFromFile } from "../src/services/studentImport.service.js";
import { generateLetterReference } from "../src/utils/generateReference.js";
import {
  admissionConflict,
  createFakeStudentsApi,
  deadlock,
  emailConflict,
} from "./helpers/fakeSupabase.js";
import { csvBuffer, testAdmin, validStudent } from "./helpers/fixtures.js";

const useFakeApi = (options) => {
  const api = createFakeStudentsApi(options);
  setSupabaseHandler(api.handler);
  return api;
};

const insertRequests = (api) =>
  api.state.requests.filter((r) => r.method === "POST" && r.path === "/rest/v1/students");

const fakeResponse = () => ({
  statusCode: 200,
  body: undefined,
  status(code) {
    this.statusCode = code;
    return this;
  },
  json(body) {
    this.body = body;
    return this;
  },
});

const callController = async (handler, req) => {
  const res = fakeResponse();
  await handler({ params: {}, body: {}, ...req }, res);
  return res;
};

test("manual creation saves the student and returns the database-generated admission number", async () => {
  const api = useFakeApi();

  // The form used to send an empty admission_number; that must keep working.
  const res = await callController(createStudent, {
    body: { ...validStudent(1), admission_number: "" },
  });

  assert.equal(res.statusCode, 201);
  assert.equal(res.body.student.admission_number, "ADM/2026/00001");

  const [insert] = insertRequests(api);
  assert.equal(insert.body.length, 1);
  assert.equal("admission_number" in insert.body[0], false, "no number is sent to the database");
  assert.equal(insert.body[0].email, "student1@example.com");
});

test("manual creation rejects an admission number sent by the client", async () => {
  const api = useFakeApi();

  const res = await callController(createStudent, {
    body: { ...validStudent(1), admission_number: "ADM/2026/00001" },
  });

  assert.equal(res.statusCode, 400);
  assert.match(res.body.message, /generated automatically/);
  assert.equal(api.state.requests.length, 0);
});

test("manual creation refuses to save when database numbering isn't set up", async () => {
  const api = useFakeApi({ ready: false });

  const res = await callController(createStudent, { body: validStudent(1) });

  assert.equal(res.statusCode, 503);
  assert.match(res.body.message, /student was not saved/);
  assert.equal(insertRequests(api).length, 0, "never saves a student without a number");
});

test("bulk import uses the same creation path and gets numbers from the database", async () => {
  const api = useFakeApi();

  const result = await importStudentsFromFile({
    buffer: csvBuffer([validStudent(1), validStudent(2), validStudent(3)]),
    fileName: "students.csv",
    admin: testAdmin,
  });

  const inserts = insertRequests(api);
  assert.equal(inserts.length, 1, "one all-or-nothing request");
  assert.equal(inserts[0].body.length, 3);
  assert.ok(inserts[0].body.every((row) => !("admission_number" in row)));
  assert.ok(
    api.state.requests.some((r) => r.path === "/rest/v1/rpc/admission_numbering_ready"),
    "checks the database numbering before inserting"
  );

  assert.deepEqual(
    result.students.map((student) => student.admission_number),
    ["ADM/2026/00001", "ADM/2026/00002", "ADM/2026/00003"]
  );

  // The spreadsheet is parsed in memory and never uploaded anywhere.
  assert.ok(
    !api.state.requests.some((request) => request.path.startsWith("/storage/")),
    "no file is written to storage"
  );
});

test("any admission number passed to the service is dropped before insert", async () => {
  const api = useFakeApi();

  const { data, error } = await createStudentsService([
    { ...validStudent(1), admission_number: "ADM/2026/99999" },
  ]);

  assert.equal(error, null);
  assert.equal("admission_number" in insertRequests(api)[0].body[0], false);
  assert.equal(data[0].admission_number, "ADM/2026/00001");
});

test("a deadlock is retried, and the retry asks the database for new numbers", async () => {
  const api = useFakeApi({ failInserts: [deadlock] });

  const { data, error } = await createStudentsService([validStudent(1), validStudent(2)]);

  assert.equal(error, null);
  const inserts = insertRequests(api);
  assert.equal(inserts.length, 2);
  assert.deepEqual(inserts[1].body, inserts[0].body, "the retry resends data, never numbers");
  assert.deepEqual(
    data.map((student) => student.admission_number),
    ["ADM/2026/00001", "ADM/2026/00002"]
  );
});

test("an admission number conflict is retried; other duplicates are not", async () => {
  const retried = useFakeApi({ failInserts: [admissionConflict] });
  const first = await createStudentsService([validStudent(1)]);

  assert.equal(first.error, null);
  assert.equal(insertRequests(retried).length, 2);

  const notRetried = useFakeApi({ failInserts: [emailConflict] });
  const second = await createStudentsService([validStudent(1)]);

  assert.equal(second.error.code, "23505");
  assert.equal(insertRequests(notRetried).length, 1);
});

test("repeated admission number conflicts end in a clear error, not a success", async () => {
  const api = useFakeApi({
    failInserts: [admissionConflict, admissionConflict, admissionConflict],
  });

  const res = await callController(createStudent, { body: validStudent(1) });

  assert.equal(res.statusCode, 409);
  assert.match(res.body.message, /Could not assign a unique admission number/);
  assert.equal(insertRequests(api).length, 3);
});

test("a duplicate email during manual creation is still reported as before", async () => {
  useFakeApi({ failInserts: [emailConflict] });

  const res = await callController(createStudent, { body: validStudent(1) });

  assert.equal(res.statusCode, 409);
  assert.equal(res.body.message, "A student with this email already exists");
});

test("updating a student can't change the admission number", async () => {
  const existing = {
    id: "student-9",
    ...validStudent(9),
    admission_number: "ADM/2026/00006",
  };
  const api = useFakeApi({ students: [existing] });

  const rejected = await callController(updateStudent, {
    params: { id: "student-9" },
    body: { admission_number: "ADM/2026/00001" },
  });

  assert.equal(rejected.statusCode, 400);
  assert.match(rejected.body.message, /can't be changed/);
  assert.equal(api.state.requests.filter((r) => r.method === "PATCH").length, 0);

  // The edit form sends the unchanged number back with other edits.
  const accepted = await callController(updateStudent, {
    params: { id: "student-9" },
    body: { full_name: "Renamed Student", admission_number: "ADM/2026/00006" },
  });

  assert.equal(accepted.statusCode, 200);
  const [patch] = api.state.requests.filter((r) => r.method === "PATCH");
  assert.deepEqual(patch.body, { full_name: "Renamed Student" });
  assert.equal(accepted.body.student.admission_number, "ADM/2026/00006");
});

test("student lookups used by admission letters return the stored admission number", async () => {
  const stored = { id: "student-5", ...validStudent(5), admission_number: "ADM/2026/00005" };
  const api = useFakeApi({ students: [stored] });

  const { data, error } = await getStudentByIdService("student-5");

  assert.equal(error, null);
  assert.equal(data.id, "student-5");
  assert.equal(data.admission_number, "ADM/2026/00005");
  assert.equal(api.state.requests[0].search.includes("id=eq.student-5"), true);
  assert.match(generateLetterReference(data), /^ADM-ADM\/2026\/00005-\d+$/);
});
