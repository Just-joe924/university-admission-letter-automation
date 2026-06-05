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