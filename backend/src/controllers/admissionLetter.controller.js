import { generateAdmissionLetterPDF } from "../services/pdf.service.js";
import { uploadAdmissionLetter } from "../services/storage.service.js";
import { createAdmissionLetterService } from "../services/admissionLetter.service.js";

const fileName = `${student.admission_number}.pdf`;
const pdfBuffer = await generateAdmissionLetterPDF(student);
const pdfUrl = await uploadAdmissionLetter(
    pdfBuffer,
    fileName
);

const { data, error } = await createAdmissionLetterService({    
    studentId: student.id,
    letterReference,
    pdfUrl
});