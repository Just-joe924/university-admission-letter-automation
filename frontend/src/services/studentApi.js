import api from "./api";

export const getAllStudents = async () => {
  const response = await api.get("/students");
  return response.data;
};

export const getStudentById = async (id) => {
  const response = await api.get(`/students/${id}`);
  return response.data;
};

export const createStudent = async (payload) => {
  const response = await api.post("/students", payload);
  return response.data;
};

export const updateStudent = async (id, payload) => {
  const response = await api.put(`/students/${id}`, payload);
  return response.data;
};

export const deleteStudent = async (id) => {
  const response = await api.delete(`/students/${id}`);
  return response.data;
};

export const verifyStudent = async (payload) => {
  const response = await api.post("/students/verify", payload);
  return response.data;
};