import { supabase } from "../config/supabase.js";

export const createAdmissionLetterService = async (
    studentId,
    letterReference,
    pdfUrl
) => {  
    const { data, error } = await supabase
        .from("admission_letters")
        .insert([
        {
            student_id: studentId,
            letter_reference: letterReference,
            pdf_url: pdfUrl,
            generated: true,
        },
        ])
        .select();
    return { data, error };
}

export const getAdmissionLetterByStudentIdService = async (studentId) => {
    const { data, error} = await supabase        
        .from("admission_letters")
        .select("*")
        .eq("student_id", studentId)
        .single();

    return { data, error };
}

export const updateAdmissionLetterService = async (letterId, updates) => {
    const { data, error} = await supabase
        .from("admission_letters")
        .update(updates)
        .eq("id", letterId)
        .select();

    return { data, error };
}