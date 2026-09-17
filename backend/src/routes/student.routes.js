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
import {
    listImports,
    getImportDetails,
    getImportErrors,
    downloadImportErrors,
} from "../controllers/importHistory.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { attachAdmin } from "../middleware/admin.middleware.js";
import { uploadSpreadsheet } from "../middleware/upload.middleware.js";

const router = express.Router();

router.post("/verify", verifyStudent);

// Bulk import (admin only). Registered before "/:id" so "import" and "imports"
// are never treated as student ids. Auth runs before the upload is read, and
// attachAdmin puts the verified admin identity on the request.
router.get("/import/template", requireAuth, downloadImportTemplate);
router.post("/import/preview", requireAuth, attachAdmin, uploadSpreadsheet, previewStudentImport);
router.post("/import", requireAuth, attachAdmin, uploadSpreadsheet, importStudents);

// Import history (admin only).
router.get("/imports", requireAuth, attachAdmin, listImports);
router.get("/imports/:importId", requireAuth, attachAdmin, getImportDetails);
router.get("/imports/:importId/errors", requireAuth, attachAdmin, getImportErrors);
router.get("/imports/:importId/errors/download", requireAuth, attachAdmin, downloadImportErrors);

router.post("/", createStudent);
router.get("/", getAllStudents);
router.get("/:id", getStudentById);
router.put("/:id", updateStudent);
router.delete("/:id", deleteStudent);


export default router;