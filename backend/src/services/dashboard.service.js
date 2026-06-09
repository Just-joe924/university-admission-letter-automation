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
    .eq("generated", true);

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
  // Aggregate in code so we don't depend on a `students_by_department` DB view.
  const { data, error } = await supabase
    .from("students")
    .select("department");

  if (error) {
    return { data: null, error };
  }

  const counts = {};
  for (const row of data) {
    const dept = row.department || "Unknown";
    counts[dept] = (counts[dept] || 0) + 1;
  }

  const result = Object.entries(counts).map(([department_name, student_count]) => ({
    department_name,
    student_count,
  }));

  return { data: result, error: null };
};

export const getRecentStudentsService = async () => {
  const { data, error } = await supabase
    .from("students")
    .select("id, full_name, email, department, course, mode_of_entry, admission_number, letter_generated, created_at")
    .order("created_at", { ascending: false })
    .limit(5);

  return { data, error };
};