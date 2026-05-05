import { supabase } from "../config/supabase.js";

export const createStudentService = async (studentData) => {
  const { data, error } = await supabase
    .from("students")
    .insert([studentData])
    .select();

  return { data, error };
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