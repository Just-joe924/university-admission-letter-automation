import { createContext, useEffect, useState } from "react";
import { getAdminProfile, loginAdmin, logoutAdmin } from "../services/authApi";

export const AuthContext = createContext(null);

export default function AuthProvider({ children }) {
  const [admin, setAdmin] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem("adminToken"));
  const [loading, setLoading] = useState(true);

  const login = async ({ email, password }) => {
    const data = await loginAdmin({ email, password });

    const accessToken = data?.session?.access_token;

    if (!accessToken) {
      throw new Error("Login failed: no access token returned");
    }

    localStorage.setItem("adminToken", accessToken);
    setToken(accessToken);

    if (data.user) {
      setAdmin(data.user);
    }

    return data;
  };

  const logout = async () => {
    try {
      await logoutAdmin();
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      localStorage.removeItem("adminToken");
      setToken(null);
      setAdmin(null);
    }
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        const data = await getAdminProfile();
        setAdmin(data.admin);
      } catch (error) {
        localStorage.removeItem("adminToken");
        setToken(null);
        setAdmin(null);
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, [token]);

  const value = {
    admin,
    token,
    loading,
    isAuthenticated: Boolean(token),
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}