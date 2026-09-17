import {
  buildImportTemplateCsv,
  importStudentsFromFile,
  previewImportFile,
} from "../services/studentImport.service.js";
import { ImportError } from "../utils/importError.js";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const sendImportError = (res, error, fallbackMessage) => {
  if (error instanceof ImportError) {
    return res.status(error.status).json({
      success: false,
      message: error.message,
      ...(error.details ? { preview: error.details } : {}),
    });
  }

  console.error(`${fallbackMessage}:`, error);
  return res.status(500).json({
    success: false,
    message: fallbackMessage,
  });
};

export const downloadImportTemplate = (req, res) => {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader(
    "Content-Disposition",
    'attachment; filename="student-import-template.csv"'
  );

  return res.status(200).send(buildImportTemplateCsv());
};

export const previewStudentImport = async (req, res) => {
  try {
    const preview = await previewImportFile({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      admin: req.admin,
    });

    return res.status(200).json(preview);
  } catch (error) {
    return sendImportError(res, error, "Failed to preview the student import");
  }
};

export const importStudents = async (req, res) => {
  // The import reference comes from the preview response; anything else is rejected.
  const importId = req.body?.importId ? String(req.body.importId).trim() : null;

  if (importId && !UUID_PATTERN.test(importId)) {
    return res.status(400).json({
      success: false,
      message: "Invalid import reference. Preview the file again.",
    });
  }

  try {
    const result = await importStudentsFromFile({
      buffer: req.file.buffer,
      fileName: req.file.originalname,
      importId,
      admin: req.admin,
    });

    return res.status(201).json(result);
  } catch (error) {
    return sendImportError(res, error, "Failed to import students");
  }
};
