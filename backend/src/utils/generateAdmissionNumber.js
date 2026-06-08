import { supabase } from "../config/supabase.js";

export const generateAdmissionNumber = async () => {
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

  const year = new Date().getFullYear();

  return `ADM/${year}/${String(nextNumber).padStart(5, "0")}`;
};