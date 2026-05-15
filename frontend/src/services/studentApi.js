import api from "./api";

export const verifyStudent = async (payload) => {
  const response = await api.post("/students/verify", payload);
  return response.data;
};

export const getAllStudents = async () => {
  const response = await api.get("/students");
  return response.data;
};