import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const options = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
};

// Service-role client for ALL database access. It must never carry a user
// session, otherwise requests run as that user and RLS gets enforced.
export const supabase = createClient(supabaseUrl, supabaseServiceKey, options);

// Separate client used ONLY for password sign-in, so signing an admin in never
// mutates the database client's auth token (which would trigger RLS errors).
export const supabaseAuth = createClient(supabaseUrl, supabaseServiceKey, options);