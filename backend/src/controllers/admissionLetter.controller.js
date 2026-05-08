import { generateAdmissionLetterPDF } from "../services/pdf.service.js";
import { uploadAdmissionLetterService } from "../services/storage.service.js";
import { getStudentByIdService } from "../services/student.service.js";
import { 
    createAdmissionLetterService, 
    getAdmissionLetterByStudentIdService,
    updateAdmissionLetterService, 
}from "../services/admissionLetter.service.js";

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
            message: "Amdission letter already exists for this student",
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

    res.status(201).json({
        message: "Admission letter generated successfully",
        admissionLetter: data?.[0],
    });
};

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

    if (error || !data) {
        return res.status(404).json({
            message: "Failed to update admission letter",
        });
    }

    if(!data || data.length === 0) {
        return res.status(404).jsoon({
            message: "Admission letter not found",
        });
    }

    return res.status(200).json({
        message: "Admission letter updated successfully",
        admissionLetter: data[0],
    });
}