import "./helpers/env.js";

import assert from "node:assert/strict";
import { test } from "node:test";

import {
  validateStudentInput,
  validateStudentRecord,
} from "../src/utils/validateStudent.js";
import { validStudent } from "./helpers/fixtures.js";

const fieldsWithErrors = (result) => result.errors.map((error) => error.field);

test("accepts a valid record and returns canonical spellings", () => {
  const result = validateStudentRecord(
    validStudent(1, {
      department: "computer science",
      course: "SOFTWARE ENGINEERING",
      mode_of_entry: "direct entry",
    })
  );

  assert.equal(result.valid, true);
  assert.deepEqual(result.errors, []);
  assert.equal(result.student.department, "Computer Science");
  assert.equal(result.student.course, "Software Engineering");
  assert.equal(result.student.mode_of_entry, "Direct Entry");
});

test("reports every missing required field, not just the first", () => {
  const result = validateStudentRecord({
    full_name: "",
    email: "",
    department: "",
    course: "",
    mode_of_entry: "",
    application_number: "",
    session: "",
    admission_number: "",
  });

  assert.equal(result.valid, false);
  assert.deepEqual(fieldsWithErrors(result), [
    "full_name",
    "email",
    "department",
    "course",
    "mode_of_entry",
    "application_number",
    "session",
  ]);
});

test("rejects an invalid email", () => {
  for (const email of ["not-an-email", "a@b", "a b@example.com", 'x"y@example.com']) {
    const result = validateStudentRecord(validStudent(1, { email }));
    assert.deepEqual(fieldsWithErrors(result), ["email"], email);
  }
});

test("rejects an unknown department", () => {
  const result = validateStudentRecord(validStudent(1, { department: "Astrology" }));

  assert.deepEqual(fieldsWithErrors(result), ["department"]);
  assert.match(result.errors[0].message, /Astrology/);
});

test("rejects a course that the department doesn't offer", () => {
  const result = validateStudentRecord(
    validStudent(1, { department: "Accounting", course: "Software Engineering" })
  );

  assert.deepEqual(fieldsWithErrors(result), ["course"]);
});

test("rejects an invalid mode of entry and session", () => {
  const result = validateStudentRecord(
    validStudent(1, { mode_of_entry: "Transfer", session: "2025/2027" })
  );

  assert.deepEqual(fieldsWithErrors(result), ["mode_of_entry", "session"]);
  assert.equal(
    validateStudentRecord(validStudent(1, { session: "2025-2026" })).valid,
    false
  );
});

test("rejects over-long values and unsafe identifiers", () => {
  const result = validateStudentRecord(
    validStudent(1, {
      full_name: "x".repeat(151),
      application_number: "APP,1",
      admission_number: 'ADM"1',
    })
  );

  assert.deepEqual(fieldsWithErrors(result), [
    "full_name",
    "application_number",
    "admission_number",
  ]);
});

test("single-student form validation behaves exactly as before", () => {
  assert.deepEqual(validateStudentInput({ full_name: "A" }), {
    valid: false,
    message: "Required fields are missing",
  });

  assert.deepEqual(
    validateStudentInput({ ...validStudent(1), mode_of_entry: "Transfer" }),
    { valid: false, message: "Mode of entry must be either UTME or Direct Entry" }
  );

  // The form path never validated department names; that must not change.
  assert.deepEqual(
    validateStudentInput({ ...validStudent(1), department: "Anything" }),
    { valid: true, message: null }
  );
});
