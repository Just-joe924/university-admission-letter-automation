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

router.get("/", (req, res) => {
  res.json({ message: "Admission letter routes working" });
});

router.get("/generate/:studentId", (req, res) => {
  res.json({ message: "You used GET, but this should be POST" });
});

export default router;