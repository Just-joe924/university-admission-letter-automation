import {
  buildImportPreview,
  buildImportTemplateCsv,
  importStudentsFromFile,
} from "../services/studentImport.service.js";
import { ImportError } from "../utils/importError.js";

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
    const preview = await buildImportPreview(req.file.buffer, req.file.originalname);
    return res.status(200).json(preview);
  } catch (error) {
    return sendImportError(res, error, "Failed to preview the student import");
  }
};

export const importStudents = async (req, res) => {
  try {
    const result = await importStudentsFromFile(req.file.buffer, req.file.originalname);
    return res.status(201).json(result);
  } catch (error) {
    return sendImportError(res, error, "Failed to import students");
  }
};
