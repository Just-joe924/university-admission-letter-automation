import { supabase } from "../config/supabase.js";

// Loads the admin profile for the authenticated user. requireAuth must run
// first: the identity always comes from the verified token, never from the
// request body or query.
//
// A signed-in user without an admin profile row can still import; the import is
// recorded against their auth user id, with no admin profile linked.
export const attachAdmin = async (req, res, next) => {
  const authUser = req.user;

  if (!authUser) {
    return res.status(401).json({ message: "No token provided" });
  }

  const { data, error } = await supabase
    .from("admins")
    .select("id, full_name, email, role")
    .eq("auth_user_id", authUser.id)
    .maybeSingle();

  if (error) {
    console.error("Load admin profile error:", error);
    return res.status(500).json({ message: "Failed to load the admin profile" });
  }

  req.admin = {
    id: data?.id ?? null,
    authUserId: authUser.id,
    name: data?.full_name || authUser.user_metadata?.full_name || authUser.email || "Unknown admin",
    email: data?.email || authUser.email || null,
    role: data?.role || authUser.user_metadata?.role || "staff",
  };

  next();
};

// Full admins see every import; other roles (registrar, staff) see only the
// imports they ran themselves.
export const canSeeAllImports = (admin) => admin?.role === "admin";
