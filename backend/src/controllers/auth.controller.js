import { supabase, supabaseAuth } from "../config/supabase.js";

export const registerAdmin = async (req, res) => {
  const { full_name, email, password, role } = req.body;

  if (!full_name || !email || !password) {
    return res.status(400).json({
      message: "Full name, email, and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      message: "Password must be at least 6 characters long",
    });
  }

  const allowedRoles = ["admin", "registrar", "staff"];
  const userRole = (role || "admin").toLowerCase();

  if (!allowedRoles.includes(userRole)) {
    return res.status(400).json({
      message: "Invalid role selected",
    });
  }

  // Create a confirmed auth user (uses the service role key) so the admin can
  // sign in immediately without an email-confirmation step.
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name, role: userRole },
    });

  if (authError) {
    const alreadyExists = /already|registered|exists/i.test(authError.message);
    return res.status(alreadyExists ? 409 : 400).json({
      message: alreadyExists
        ? "An account with this email already exists"
        : authError.message,
    });
  }

  // Create the matching admin profile row (read back by /auth/profile on login).
  const { data: admin, error: adminError } = await supabase
    .from("admins")
    .insert([
      {
        auth_user_id: authData.user.id,
        full_name,
        email,
        role: userRole,
      },
    ])
    .select("id, auth_user_id, full_name, email, role, created_at")
    .single();

  if (adminError) {
    // Roll back the auth user so we don't leave an orphaned account.
    await supabase.auth.admin.deleteUser(authData.user.id);

    if (adminError.code === "23505") {
      return res.status(409).json({
        message: "An admin with this email already exists",
      });
    }

    console.error("Create admin profile error:", adminError);
    return res.status(500).json({
      message: "Failed to create admin profile",
    });
  }

  return res.status(201).json({
    message: "Admin registered successfully",
    admin,
  });
};

export const loginAdmin = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      message: "Email and password are required",
    });
  }

  // Sign in on the dedicated auth client so we don't attach this user's token
  // to the shared service-role database client.
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
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

export const getAdminProfile = async (req, res) => {
    const authUser = req.user;

    const { data: admin, error } = await supabase
        .from("admins")
        .select("id, auth_user_id, full_name, email, role, created_at")
        .eq("auth_user_id", authUser.id)
        .single();

    if (error || !admin) {
        return res.status(404).json({
            message: "Admin profile not found",
        });
    }

    return res.status(200).json({
        message: "Admin profile fetched successfully",
        admin,
    });
};

export const logoutAdmin = async (req, res) => {
    return res.status(200).json({
        message: "Admin logged out successfully",
    });
};
