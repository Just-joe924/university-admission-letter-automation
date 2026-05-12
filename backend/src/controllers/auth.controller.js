import { supabase } from "../config/supabase.js";

export const registerAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    return res.status(400).json({
      message: error.message,
    });
  }

  return res.status(201).json({
    message: "Admin registered successfully",
    user: data.user,
  });
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return res.status(401).json({
      message: "Invalid email or password",
    });
  }

  return res.status(200).json({
    message: "Admin logged in successfully",
    user: data.user,
    session: data.session,
  });
};
