import express from "express";
import {
    createStudent,
    getAllStudents,
    getStudentById,
    updateStudent,
    deleteStudent,
    verifyStudent,
} from "../controllers/student.controller.js";
import {
    downloadImportTemplate,
    previewStudentImport,
    importStudents,
} from "../controllers/studentImport.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { uploadSpreadsheet } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/verify", verifyStudent);

// Bulk import (admin only). Registered before "/:id" so "import" is never
// treated as a student id. Auth runs before the upload is read.
router.get("/import/template", requireAuth, downloadImportTemplate);
router.post("/import/preview", requireAuth, uploadSpreadsheet, previewStudentImport);
router.post("/import", requireAuth, uploadSpreadsheet, importStudents);

router.post("/", createStudent);
router.get("/", getAllStudents);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);


export default router;