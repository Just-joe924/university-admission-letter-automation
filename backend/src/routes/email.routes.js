import express from "express";
import {
    getAllEmailLogs,
    getEmailLogsByStudentId,
} from "../controllers/email.controller.js";

const router = express.Router();

router.get("/", getAllEmailLogs);
router.get("/:studentId", getEmailLogsByStudentId);

export default router;