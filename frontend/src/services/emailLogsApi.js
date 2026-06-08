import api from "./api";

export const getAllEmailLogs = async () => {
  const response = await api.get("/email-logs");
  return response.data;
};

export const getEmailLogsByStudent = async (studentId) => {
  const response = await api.get(`/email-logs/${studentId}`);
  return response.data;
};
