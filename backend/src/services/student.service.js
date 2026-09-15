import { supabase } from "../config/supabase.js";
import { IMPORT_DB_LOOKUP_CHUNK_SIZE } from "../constants/studentImport.js";

// Returned as error.code when the database can't assign admission numbers yet.
export const ADMISSION_NUMBERING_NOT_READY = "ADMISSION_NUMBERING_NOT_READY";

// Deadlocks and serialization failures are safe to retry: the database assigns
// fresh admission numbers on every attempt, so a retry never reuses one.
const RETRYABLE_ERROR_CODES = new Set(["40P01", "40001"]);
const MAX_INSERT_ATTEMPTS = 3;

export const isAdmissionNumberConflict = (error) =>
  error?.code === "23505" &&
  /admission_number/i.test(`${error.message || ""} ${error.details || ""}`);

// Admission numbers are assigned by the students_assign_admission_number
// trigger (supabase/migrations/20260915120000_concurrency_safe_admission_numbers.sql).
// Checked before every insert so a student is never saved without one.
export const checkAdmissionNumberingService = async () => {
  const { data, error } = await supabase.rpc("admission_numbering_ready");

  return { ready: !error && data === true, error };
};

// The one way students are created, shared by the single-student form and bulk
// import. Admission numbers are never taken from the caller: the database
// generates them inside the insert transaction. All rows go in one request, so
// either every student is saved or none are.
export const createStudentsService = async (students) => {
  const { ready, error: readinessError } = await checkAdmissionNumberingService();

  if (!ready) {
    console.error(
      "Admission numbering is not set up in the database:",
      readinessError?.message || "trigger missing or disabled"
    );

    return {
      data: null,
      error: {
        code: ADMISSION_NUMBERING_NOT_READY,
        message: "The database is not set up to generate admission numbers",
      },
    };
  }

  // Ordered by session so concurrent imports lock the yearly counters in the
  // same order and can't deadlock each other.
  const rows = students
    .map(({ admission_number: _ignored, ...student }) => student)
    .sort((a, b) => String(a.session ?? "").localeCompare(String(b.session ?? "")));

  let lastError = null;

  for (let attempt = 1; attempt <= MAX_INSERT_ATTEMPTS; attempt += 1) {
    const { data, error } = await supabase.from("students").insert(rows).select();

    if (!error) {
      if (data?.some((student) => !student.admission_number)) {
        console.error(
          "Students were saved without an admission number; check the admission number trigger."
        );
      }

      return { data, error: null };
    }

    lastError = error;

    if (!RETRYABLE_ERROR_CODES.has(error.code) && !isAdmissionNumberConflict(error)) {
      break;
    }

    console.warn(
      `Student insert attempt ${attempt} of ${MAX_INSERT_ATTEMPTS} failed (${error.code}); retrying with new admission numbers.`
    );
  }

  return { data: null, error: lastError };
};

export const createStudentService = async (studentData) =>
  createStudentsService([studentData]);

// Finds existing students whose email or application number is in the given
// lists. Only those values are queried (in batches), never the whole table.
export const findStudentsByUniqueFieldsService = async ({
  emails = [],
  applicationNumbers = [],
}) => {
  const lookups = [];

  for (const [column, values] of [
    ["email", emails],
    ["application_number", applicationNumbers],
  ]) {
    for (let i = 0; i < values.length; i += IMPORT_DB_LOOKUP_CHUNK_SIZE) {
      lookups.push(
        supabase
          .from("students")
          .select("id, email, application_number, admission_number")
          .in(column, values.slice(i, i + IMPORT_DB_LOOKUP_CHUNK_SIZE))
      );
    }
  }

  const results = await Promise.all(lookups);
  const failed = results.find((result) => result.error);

  if (failed) {
    return { data: null, error: failed.error };
  }

  const byId = new Map();
  for (const { data } of results) {
    for (const student of data || []) byId.set(student.id, student);
  }

  return { data: [...byId.values()], error: null };
};

export const getAllStudentsService = async () => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  return { data, error };
};

export const getStudentByIdService = async (id) => {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .eq("id", id)
    .single();

  return { data, error };
};

export const updateStudentService = async (id, updates) => {
  const { data, error } = await supabase
    .from("students")
    .update(updates)
    .eq("id", id)
    .select();

  return { data, error };
};

export const deleteStudentService = async (id) => {
  // Remove dependent records first so foreign-key constraints don't block the
  // student deletion. (email_logs references admission_letters, so delete it first.)
  const { error: emailLogsError } = await supabase
    .from("email_logs")
    .delete()
    .eq("student_id", id);

  if (emailLogsError) {
    return { data: null, error: emailLogsError };
  }

  const { error: lettersError } = await supabase
    .from("admission_letters")
    .delete()
    .eq("student_id", id);

  if (lettersError) {
    return { data: null, error: lettersError };
  }

  const { data, error } = await supabase
    .from("students")
    .delete()
    .eq("id", id)
    .select();

  return { data, error };
};

export const verifyStudentService = async (email, application_number) => {
  const { data, error } = await supabase
    .from("students")
    .select(
      "id, full_name, email, department, course, mode_of_entry, admission_number, application_number, session, letter_generated, email_sent"
    )
    .eq("email", email)
    .eq("application_number", application_number)
    .single();

  return { data, error };
};