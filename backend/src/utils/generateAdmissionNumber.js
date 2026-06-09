import { supabase } from "../config/supabase.js";

export const generateAdmissionNumber = async (session) => {
  const { count, error } = await supabase
    .from("students")
    .select("*", {
      count: "exact",
      head: true,
    });

  if (error) {
    throw new Error("Failed to generate admission number");
  }

  const nextNumber = (count || 0) + 1;

  // Use the session's starting year (e.g. "2025/2026" -> 2025) so the admission
  // number matches the academic session; fall back to the current year.
  const year = session?.split("/")[0] || new Date().getFullYear();

  return `ADM/${year}/${String(nextNumber).padStart(5, "0")}`;
};