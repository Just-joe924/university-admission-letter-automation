import multer from "multer";

import {
  IMPORT_ALLOWED_EXTENSIONS,
  IMPORT_MAX_FILE_SIZE_BYTES,
} from "../constants/studentImport.js";
import { getFileExtension } from "../utils/parseSpreadsheet.js";

const maxSizeMb = IMPORT_MAX_FILE_SIZE_BYTES / (1024 * 1024);

const upload = multer({
  // Keep the spreadsheet in memory only: it is parsed and discarded, never
  // written to disk or to Supabase Storage.
  storage: multer.memoryStorage(),
  limits: {
    fileSize: IMPORT_MAX_FILE_SIZE_BYTES,
    files: 1,
    fields: 10,
  },
  fileFilter: (req, file, cb) => {
    if (!IMPORT_ALLOWED_EXTENSIONS.includes(getFileExtension(file.originalname))) {
      const error = new Error(
        `Unsupported file type. Upload a ${IMPORT_ALLOWED_EXTENSIONS.join(", ")} file.`
      );
      error.status = 415;
      return cb(error);
    }

    cb(null, true);
  },
}).single("file");

// Accepts one spreadsheet in the "file" multipart field and turns upload
// problems into clear JSON errors.
export const uploadSpreadsheet = (req, res, next) => {
  upload(req, res, (error) => {
    if (error instanceof multer.MulterError) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          message: `File is too large. The maximum size is ${maxSizeMb} MB.`,
        });
      }

      return res.status(400).json({
        message: 'Upload exactly one file in the "file" field.',
      });
    }

    if (error) {
      return res.status(error.status || 400).json({
        message: error.message || "Invalid file upload.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded. Choose a CSV or Excel file.",
      });
    }

    next();
  });
};
