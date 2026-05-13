import express from "express";
import {
    getDashboardStats,
    getModeOfEntryStats,
    getStudentsByDepartments,
    getRecentStudents,
} from "../controllers/dashboard.controller.js";

const router = express.Router();

router.get("/stats", getDashboardStats);
router.get("/mode-of-entry", getModeOfEntryStats);
router.get("/students-by-department", getStudentsByDepartments);
router.get("/recent-students", getRecentStudents);

export default router;