import api from "./api";

export const getDashboardStats = async () => {
  const response = await api.get("/dashboard/stats");
  return response.data;
};

export const getModeOfEntryStats = async () => {
  const response = await api.get("/dashboard/mode-of-entry");
  return response.data;
};

export const getStudentsByDepartment = async () => {
  const response = await api.get("/dashboard/students-by-department");
  return response.data;
};

export const getRecentStudents = async () => {
  const response = await api.get("/dashboard/recent-students");
  return response.data;
};