import express from "express";
import { supabase } from "../config/supabase.js";
import {
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    verifyStudent,
} from "../controllers/student.controller.js";

const router = express.Router();

router.post("/", createStudent);
router.get("/", getAllStudents);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);
router.post("/verify", verifyStudent);

export default router;