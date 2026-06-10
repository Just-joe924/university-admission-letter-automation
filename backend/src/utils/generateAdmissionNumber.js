import { supabase } from "../config/supabase.js";

export const generateAdmissionNumber = async (session) => {
  // Use the session's starting year (e.g. "2025/2026" -> 2025) so the admission
  // number matches the academic session; fall back to the current year.
  const year = String(session?.split("/")[0] || new Date().getFullYear());
  const prefix = `ADM/${year}/`;

  // Base the next sequence on the HIGHEST existing number for this year prefix
  // (not the total student count, which collides after deletions). max + 1 is
  // always greater than every existing number for the prefix, so it's unique.
  const { data, error } = await supabase
    .from("students")
    .select("admission_number")
    .like("admission_number", `${prefix}%`);

  if (error) {
    throw new Error("Failed to generate admission number");
  }

  let max = 0;
  for (const row of data || []) {
    const seq = parseInt(row.admission_number.slice(prefix.length), 10);
    if (!Number.isNaN(seq) && seq > max) {
      max = seq;
    }
  }

  return `${prefix}${String(max + 1).padStart(5, "0")}`;
};
