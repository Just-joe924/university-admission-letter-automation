import express from 'express';
import {
  generateAdmissionLetter,
  getAdmissionLetterByStudentId,
  updateAdmissionLetter,
  resendAdmissionLetterEmail,
  downloadAdmissionLetter,
  sendAdmissionLetterToStudent,
} from '../controllers/admissionLetter.controller.js';

const router = express.Router();

router.post("/generate/:studentId", generateAdmissionLetter);
router.post("/resend/:studentId", resendAdmissionLetterEmail);
router.get("/download/:studentId", downloadAdmissionLetter);
router.post("/send/:studentId", sendAdmissionLetterToStudent);
router.get("/student/:studentId", getAdmissionLetterByStudentId);
router.put("/:letterId", updateAdmissionLetter);

export default router;