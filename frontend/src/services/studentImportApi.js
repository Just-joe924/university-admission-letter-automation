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

// Validates the file on the server without saving anything.
export const previewStudentImport = async (file) => {
  const response = await api.post("/students/import/preview", toFormData(file));
  return response.data;
};

// Sends the same file again; the server re-validates it before inserting.
export const importStudents = async (file) => {
  const response = await api.post("/students/import", toFormData(file));
  return response.data;
};
