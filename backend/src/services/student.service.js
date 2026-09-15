import { supabase } from "../config/supabase.js";
import { IMPORT_DB_LOOKUP_CHUNK_SIZE } from "../constants/studentImport.js";

export const createStudentService = async (studentData) => {
  const { data, error } = await supabase
    .from("students")
    .insert([studentData])
    .select();

  return { data, error };
};

// Inserts many students in ONE request. PostgREST runs it as a single
// statement, so either every row is saved or none are.
export const createStudentsService = async (students) => {
  const { data, error } = await supabase
    .from("students")
    .insert(students)
    .select();

  return { data, error };
};

// Finds existing students whose email, application number or admission number
// is in the given lists. Only those values are queried (in batches), never the
// whole table.
export const findStudentsByUniqueFieldsService = async ({
  emails = [],
  applicationNumbers = [],
  admissionNumbers = [],
}) => {
  const lookups = [];

  for (const [column, values] of [
    ["email", emails],
    ["application_number", applicationNumbers],
    ["admission_number", admissionNumbers],
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