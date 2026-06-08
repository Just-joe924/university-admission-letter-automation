import api from "./api";

export const getAdmissionLetterByStudent = async (studentId) => {
  const response = await api.get(`/admission-letters/student/${studentId}`);
  return response.data;
};

export const generateAdmissionLetter = async (studentId) => {
  const response = await api.post(`/admission-letters/generate/${studentId}`);
  return response.data;
};

export const resendAdmissionLetterEmail = async (studentId) => {
  const response = await api.post(`/admission-letters/resend/${studentId}`);
  return response.data;
};

export const updateAdmissionLetter = async (letterId, payload) => {
  const response = await api.put(`/admission-letters/${letterId}`, payload);
  return response.data;
};

// Student-facing: download the admission letter PDF (returns a Blob)
export const downloadAdmissionLetterPdf = async (studentId) => {
  const response = await api.get(`/admission-letters/download/${studentId}`, {
    responseType: "blob",
  });
  return response.data;
};

// Student-facing: email the admission letter to the student's own address
export const sendAdmissionLetterToStudent = async (studentId) => {
  const response = await api.post(`/admission-letters/send/${studentId}`);
  return response.data;
};