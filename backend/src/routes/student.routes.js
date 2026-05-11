import express from "express";
import {
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    verifyStudent,
} from "../controllers/student.controller.js";

const router = express.Router();

router.post("/verify", verifyStudent);

router.post("/api/students", createStudent);
router.get("/api/students", getAllStudents);
router.get("/api/students/:id", getStudentById);
router.put("/api/students/:id", updateStudent);
router.delete("/api/students/:id", deleteStudent);


export default router;