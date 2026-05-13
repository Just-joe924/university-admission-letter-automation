import {supabase} from "../config/supabase.js";

export const getTotalStudentsCountService = async () => {
  const { count, error } = await supabase
    .from("students")
    .select("*", {
      count: "exact",
      head: true,
    });

  return { count, error };
};

export const getStudentsCountByModeService = async (mode) => {
  const {count, error} = await supabase
    .from("students")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("mode_of_entry", mode)
  
  return { count, error };
};

export const getGeneratedLettersCountService = async() => {
  const {count, error} = await supabase
    .from("admission_letters")
    .select("*",  {
      count: "exact",
      head: true,
    })
    .eq("generate", true);

  return { count, error };
};

export const getEmailSendingStatusCountByModeService = async(mode) => {
  const {count, error} = await supabase
    .from("email_logs")
    .select("*", {
      count: "exact",
      head: true,
    })
    .eq("status", mode)

  return { count, error };
}

export const getStudentsByDepartmentsService = async() => {
  const {data, error} = await supabase
    .from("students_by_department")
    .select("department_name, student_count")

  return { data, error };
};

export const getRecentStudentsService = async () => {
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, email, department, course, mode_of_entry, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return { data, error };
};