// Mirrors backend/src/constants/studentImport.js. These only give instant
// feedback in the browser; the backend enforces the real limits.
export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_ACCEPTED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

export const formatFileSize = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const getFileExtension = (name = "") => {
  const dot = name.lastIndexOf(".");
  return dot === -1 ? "" : name.slice(dot).toLowerCase();
};

// Returns a message explaining why the file can't be uploaded, or "" if it can.
export const getImportFileError = (file) => {
  if (!file) return "Choose a CSV or Excel file to upload.";

  if (!IMPORT_ACCEPTED_EXTENSIONS.includes(getFileExtension(file.name))) {
    return `Unsupported file type. Upload a ${IMPORT_ACCEPTED_EXTENSIONS.join(", ")} file.`;
  }

  if (file.size === 0) return "The selected file is empty.";

  if (file.size > IMPORT_MAX_FILE_SIZE_BYTES) {
    return `File is too large (${formatFileSize(file.size)}). The maximum size is ${formatFileSize(IMPORT_MAX_FILE_SIZE_BYTES)}.`;
  }

  return "";
};

// Import is only allowed for a preview the backend marked importable and that
// contains no row errors at all.
export const canImportPreview = (preview) =>
  Boolean(preview?.canImport) &&
  preview.summary?.totalRows > 0 &&
  preview.summary.invalidRows === 0 &&
  Array.isArray(preview.rows) &&
  preview.rows.every((row) => row.errors?.length === 0);
