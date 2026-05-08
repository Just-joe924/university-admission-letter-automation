import {supabase} from "../config/supabase.js";

export const uploadAdmissionLetterService = async(pdfBuffer, fileName) => {
    const { data, error } = await supabase.storage
        .from('admission-letters')
        .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            cacheControl: '3600',
            upsert: true,
        });

        if (error) {
            throw new Error(error.message);
        }
     
    const { data: publicUrlData, error: publicUrlError } = await supabase.storage
        .from('admission-letters')
        .getPublicUrl(fileName);
        if (publicUrlError) {
            throw new Error(publicUrlError.message);
        }

    return publicUrlData.publicUrl;
};