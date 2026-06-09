import { generateAdmissionLetterPDF } from "../services/pdf.service.js";
import { uploadAdmissionLetterService } from "../services/storage.service.js";
import { getStudentByIdService, updateStudentService } from "../services/student.service.js";
import { 
    createAdmissionLetterService, 
    getAdmissionLetterByStudentIdService,
    updateAdmissionLetterService, 
}from "../services/admissionLetter.service.js";
import { createEmailLogService } from "../services/emailLog.service.js";

import { generateLetterReference } from "../utils/generateReference.js";

export const generateAdmissionLetter = async (req, res) => {
    const { studentId } = req.params;

    const { data: student , error: studentError } = 
        await getStudentByIdService(studentId);

    if (studentError || !student) {
        return res.status(404).json({ 
            message: "Student not found",    
        });
    }

    // If a letter already exists we regenerate it (idempotent), so clicking
    // "Generate" again refreshes the PDF instead of failing.
    const {data : existingLetter} =
        await getAdmissionLetterByStudentIdService(studentId);

    const fileName = `${student.admission_number}-${Date.now()}.pdf`;

    const pdfBuffer = await generateAdmissionLetterPDF(student);

    const pdfUrl = await uploadAdmissionLetterService(
        pdfBuffer,
        fileName
    );

    const letterReference =
        existingLetter?.letter_reference || generateLetterReference(student);

    let admissionLetter;

    if (existingLetter) {
        const { data, error } = await updateAdmissionLetterService(
            existingLetter.id,
            { pdf_url: pdfUrl, letter_reference: letterReference, generated: true }
        );

        if (error) {
            console.error("Update admission letter error:", error);
            return res.status(500).json({
                message: "Failed to update admission letter record",
            });
        }

        admissionLetter = data?.[0];
    } else {
        const { data, error } = await createAdmissionLetterService(
            student.id,
            letterReference,
            pdfUrl
        );

        if (error) {
            console.error("Create Admission letter error:", error);

            if (error.code === "23505") {
                return res.status(409).json({
                    message: "Admission letter already exists for this student",
                });
            }

            return res.status(500).json({
                message: "Failed to save admission letter record",
            });
        }

        admissionLetter = data?.[0];
    }

    // Mark the student as having a generated letter so other screens stay in sync.
    await updateStudentService(student.id, { letter_generated: true });

    // Queue the email for background delivery instead of sending it inline,
    // so this request returns quickly and email failures don't block it.
    await createEmailLogService(
        student.id,
        admissionLetter.id,
        student.email,
        "Your Admission Letter from Caleb University",
        "pending"
    );

    return res.status(201).json({
        message: "Admission letter generated. The email has been queued for delivery.",
        admissionLetter,
        pdfUrl: admissionLetter.pdf_url,
        emailQueued: true,
    });
}

// Student-facing: stream the admission letter PDF (generated from the template)
export const downloadAdmissionLetter = async (req, res) => {
    const { studentId } = req.params;

    const { data: student, error } = await getStudentByIdService(studentId);

    if (error || !student) {
        return res.status(404).json({ message: "Student not found" });
    }

    try {
        const pdfBuffer = await generateAdmissionLetterPDF(student);

        // `?inline=1` displays the PDF in-browser (used by Print); default downloads.
        const disposition = req.query.inline ? "inline" : "attachment";

        res.setHeader("Content-Type", "application/pdf");
        res.setHeader(
            "Content-Disposition",
            `${disposition}; filename="admission-letter-${student.admission_number || student.id}.pdf"`
        );

        return res.send(pdfBuffer);
    } catch (err) {
        console.error("Download admission letter error:", err);
        return res.status(500).json({
            message: "Failed to generate admission letter PDF",
        });
    }
};

// Student-facing: email the admission letter to the student's own address
export const sendAdmissionLetterToStudent = async (req, res) => {
    const { studentId } = req.params;

    const { data: student, error } = await getStudentByIdService(studentId);

    if (error || !student) {
        return res.status(404).json({ message: "Student not found" });
    }

    // An email log must reference a letter, so make sure one exists first
    // (generate it on the fly if the admin hasn't generated it yet).
    let { data: letter } = await getAdmissionLetterByStudentIdService(studentId);

    if (!letter) {
        try {
            const fileName = `${student.admission_number}-${Date.now()}.pdf`;
            const pdfBuffer = await generateAdmissionLetterPDF(student);
            const pdfUrl = await uploadAdmissionLetterService(pdfBuffer, fileName);
            const letterReference = generateLetterReference(student);

            const { data: created, error: createError } =
                await createAdmissionLetterService(student.id, letterReference, pdfUrl);

            if (createError) {
                console.error("Create admission letter error:", createError);
                return res.status(500).json({
                    message: "Failed to prepare admission letter",
                });
            }

            letter = created?.[0];
            await updateStudentService(student.id, { letter_generated: true });
        } catch (err) {
            console.error("Prepare admission letter error:", err);
            return res.status(500).json({
                message: "Failed to prepare admission letter",
            });
        }
    }

    const { error: queueError } = await createEmailLogService(
        student.id,
        letter.id,
        student.email,
        "Your Admission Letter from Caleb University",
        "pending"
    );

    if (queueError) {
        console.error("Queue email error:", queueError);
        return res.status(500).json({
            message: "Failed to queue admission letter email",
        });
    }

    return res.status(202).json({
        message: "Your admission letter will be emailed to you shortly.",
        emailQueued: true,
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

    // Re-queue the email for background delivery.
    const { error: queueError } = await createEmailLogService(
        student.id,
        admissionLetter.id,
        student.email,
        "Your Admission Letter from Caleb University",
        "pending"
    );

    if (queueError) {
        console.error("Queue email error:", queueError);
        return res.status(500).json({
            message: "Failed to queue admission letter email",
        });
    }

    return res.status(202).json({
        message: "Admission letter email re-queued for delivery.",
        admissionLetter,
        emailQueued: true,
    });
}