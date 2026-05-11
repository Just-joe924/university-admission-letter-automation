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