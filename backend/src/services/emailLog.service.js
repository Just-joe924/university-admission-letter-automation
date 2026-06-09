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

// ── Queue helpers (email_logs acts as a simple DB-backed job queue) ──────────

// Fetch the oldest pending jobs to process ("pending" is the queued state).
export const getQueuedEmailLogsService = async (limit = 5) => {
  const { data, error } = await supabase
    .from("email_logs")
    .select("*")
    .eq("status", "pending")
    .order("sent_at", { ascending: true })
    .limit(limit);

  return { data, error };
};

// Update a single email log row (status, error_message, sent_at, ...).
export const updateEmailLogService = async (id, updates) => {
  const { data, error } = await supabase
    .from("email_logs")
    .update(updates)
    .eq("id", id)
    .select();

  return { data, error };
};