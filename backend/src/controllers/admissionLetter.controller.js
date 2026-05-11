import { generateAdmissionLetterPDF } from "../services/pdf.service.js";
import { uploadAdmissionLetterService } from "../services/storage.service.js";
import { getStudentByIdService } from "../services/student.service.js";
import { 
    createAdmissionLetterService, 
    getAdmissionLetterByStudentIdService,
    updateAdmissionLetterService, 
}from "../services/admissionLetter.service.js";
import { sendAdmissionLetterEmailService } from "../services/email.service.js";
import { createEmailLogService } from "../services/emailLog.service.js";

const generateLetterReference = (student) => {
  return `ADM-${student.admission_number}-${Date.now()}`;
};

export const generateAdmissionLetter = async (req, res) => {
    const { studentId } = req.params;

    const { data: student , error: studentError } = 
        await getStudentByIdService(studentId);

    if (studentError || !student) {
        return res.status(404).json({ 
            message: "Student not found",    
        });
    }

    const {data : existingLetter} =
        await getAdmissionLetterByStudentIdService(studentId);
    
    if (existingLetter) {
        return res.status(400).json({
            message: "Admission letter already exists for this student",
        });
    }

    const fileName = `${student.admission_number}-${Date.now()}.pdf`;

    const pdfBuffer = await generateAdmissionLetterPDF(student);

    const pdfUrl = await uploadAdmissionLetterService(
        pdfBuffer,
        fileName
    );

    const letterReference = generateLetterReference(student);

    const {data, error} = await createAdmissionLetterService({
        studentId: student.id,
        letterReference,
        pdfUrl
    });

    if (error) {
        console.error("Create Admission letter error:", error);

        if(error.code === "23505") {
            return res.status(409).json({
                message: "Admission letter already exists for this student",
            });
        }

        return res.status(500).json({
            message: "Failed to save admission letter record",
        });
    }

    const admissionLetter = data?.[0];

    try{
        await sendAdmissionLetterEmailService({
            to: student.email,
            studentName: student.full_name,
            pdfBuffer,
            fileName,
        });

        await createEmailLogService({
            studentId: student.id,
            admissionLetterId: admissionLetter.id,
            recipientEmail: student.email,
            subject: "Your Admission Letter from Caleb University",
            status: "sent",
        });

    } catch (emailError){
        console.error("Send email error:", emailError);

        await createEmailLogService({
            studentId: student.id,
            admissionLetterId: admissionLetter.id,
            recipientEmail: student.email,
            subject: "Your Admission Letter from Caleb University",
            status: "failed",
            errorMessage: emailError.message,
        })

        return res.status(201).json({
            message: "Admission letter generated successfully, but failed to send email",
            admissionLetter,
            pdfUrl: admissionLetter.pdf_url,
            emailSent: false,
        });
    }

    return res.status(201).json({
        message: "Admission letter generated and emailed successfully ",
        admissionLetter,
        pdfUrl: admissionLetter.pdf_url,
        emailSent: true,
    });
}

export const getAdmissionLetterByStudentId = async (req, res) => {
    const { studentId } = req.params;
    const {data, error} = await getAdmissionLetterByStudentIdService(req.params.studentId);
    if (error || !data) {
        return res.status(404).json({
            message: "Admission letter not found for this student",
        });
    }
    res.status(200).json({
        admissionLetter: data,
    });
};

export const updateAdmissionLetter = async (req, res) => {
    const { letterId } = req.params;
    const updates = req.body;

    if(!updates || Object.keys(updates).length === 0) {
        return res.status(400).json({
            message: "No updates fields provided",
        });
    }

    const {data, error} = await updateAdmissionLetterService(letterId, updates);

    if (error) {
        return res.status(500).json({
            message: "Failed to update admission letter",
        });
    }

    if(!data || data.length === 0) {
        return res.status(404).json({
            message: "Admission letter not found",
        });
    }

    return res.status(200).json({
        message: "Admission letter updated successfully",
        admissionLetter: data[0],
    });
}

export const resendAdmissionLetterEmail = async (req, res) => {
    const{studentId} = req.params;

    const {data: student, error: studentError} = await getStudentByIdService(studentId);

    if(studentError || !student){
        return res.status(404).json({
            message: "Student not found",
        });
    }

    const {data: admissionLetter, error: letterError} = await getAdmissionLetterByStudentIdService(studentId);

    if(letterError || !admissionLetter) {
        return res.status(404).json({
            message: "Admission letter has not been generated for this student",
        });
    }

    try{
        //re-generate PDF atachment from student data
        const fileName = `${student.admission_number}-resend.pdf`    
        const pdfBuffer = await generateAdmissionLetterPDF(student);

        await sendAdmissionLetterEmailService({
            to: student.email,
            studentName: student.full_name,
            pdfBuffer,
            fileName,
        });

        await createEmailLogService({
            studentId: student.id,
            admissionLetterId: admissionLetter.id,
            recipientEmail: student.email,
            subject: "Your Admission Letter from Caleb University",
            status: "sent",
        });

        return res.status(200).json({
            message: "Admission letter email sent successfully",
            admissionLetter,
            emailSent: true,
        })
        
    }catch(emailError){
        console.error("Send email error:", emailError);

        await createEmailLogService({
            studentId: student.id,
            admissionLetterId: admissionLetter.id,
            recipientEmail: student.email,
            subject: "Your Admission Letter from Caleb University",
            status: "failed",
            errorMessage: emailError.message,
        })

        return res.status(500).json({
            message: "Failed to send admission letter email",
        });
    }
}