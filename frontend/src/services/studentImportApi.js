import api from "./api";

const toFormData = (file) => {
  const formData = new FormData();
  formData.append("file", file);
  return formData;
};

// Returns the CSV template as a Blob.
export const downloadImportTemplate = async () => {
  const response = await api.get("/students/import/template", {
    responseType: "blob",
  });
  return response.data;
};

// Validates the file on the server without saving anything. The response
// carries an importId that ties the confirmed import to this preview.
export const previewStudentImport = async (file) => {
  const response = await api.post("/students/import/preview", toFormData(file));
  return response.data;
};

// Sends the same file again; the server re-validates it before inserting and
// accepts the importId only once, so a repeated submission can't import twice.
export const importStudents = async (file, importId) => {
  const formData = toFormData(file);
  if (importId) formData.append("importId", importId);

  const response = await api.post("/students/import", formData);
  return response.data;
};

export const getImportHistory = async (params) => {
  const response = await api.get("/students/imports", { params });
  return response.data;
};

export const getImportDetails = async (importId, params) => {
  const response = await api.get(`/students/imports/${importId}`, { params });
  return response.data;
};

export const getImportErrors = async (importId, params) => {
  const response = await api.get(`/students/imports/${importId}/errors`, { params });
  return response.data;
};

// Returns the error report as a Blob.
export const downloadImportErrors = async (importId) => {
  const response = await api.get(`/students/imports/${importId}/errors/download`, {
    responseType: "blob",
  });
  return response.data;
};
