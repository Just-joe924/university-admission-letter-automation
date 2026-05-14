import { supabase } from "../config/supabase.js";

export const createEmailLogService = async (studentId, admissionLetterId, recipientEmail, subject, status, errorMessage = null) => {
    const {data, error} = await supabase
        .from("email_logs")
        .insert([
            {
                student_id: studentId,
                admission_letter_id: admissionLetterId,
                recipient_email: recipientEmail,
                subject,
                status,
                error_message: errorMessage,
            }
        ])
        .select();

    return { data, error };
}

export const getAllEmailLogsService = async () => {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .order("sent_at", { ascending: false });

  return { data, error };
};

export const getEmailLogsByStudentIdService = async (studentId) => {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("student_id", studentId)
    .order("sent_at", { ascending: false });

  return { data, error };
};