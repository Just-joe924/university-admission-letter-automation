import express from 'express';
import {
    generateAdmissionLetter,
    getAdmissionLetterByStudentId,
    updateAdmissionLetter,
} from '../controllers/admissionLetter.controller.js';

const router = express.Router();

router.post("/generate/:studentId", generateAdmissionLetter);
router.get("/student/:studentId", getAdmissionLetterByStudentId);
router.put("/:letterId", updateAdmissionLetter);

export default router;