import api from "./api";

export const loginAdmin = async (payload) => {
  const response = await api.post("/auth/login", payload);
  return response.data;
};

export const registerAdmin = async (payload) => {
  const response = await api.post("/auth/register", payload);
  return response.data;
};

export const getAdminProfile = async () => {
  const response = await api.get("/auth/profile");
  return response.data;
};

export const logoutAdmin = async () => {
  const response = await api.post("/auth/logout");
  return response.data;
};