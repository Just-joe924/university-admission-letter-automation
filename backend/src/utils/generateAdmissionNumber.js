import { supabase } from "../config/supabase.js";

// Use the session's starting year (e.g. "2025/2026" -> 2025) so the admission
// number matches the academic session; fall back to the current year.
export const getAdmissionNumberPrefix = (session) =>
  `ADM/${String(session?.split("/")[0] || new Date().getFullYear())}/`;

export const formatAdmissionNumber = (prefix, sequence) =>
  `${prefix}${String(sequence).padStart(5, "0")}`;

// The numeric sequence of an admission number with the given prefix, or NaN.
export const parseAdmissionSequence = (admissionNumber, prefix) =>
  admissionNumber?.startsWith(prefix)
    ? parseInt(admissionNumber.slice(prefix.length), 10)
    : NaN;

// Base the next sequence on the HIGHEST existing number for this year prefix
// (not the total student count, which collides after deletions).
export const getHighestAdmissionSequence = async (prefix) => {
  const { data, error } = await supabase
    .from("students")
    .select("admission_number")
    .like("admission_number", `${prefix}%`);

  if (error) {
    throw new Error("Failed to generate admission number");
  }

  let max = 0;
  for (const row of data || []) {
    const seq = parseAdmissionSequence(row.admission_number, prefix);
    if (!Number.isNaN(seq) && seq > max) {
      max = seq;
    }
  }

  return max;
};

export const generateAdmissionNumber = async (session) => {
  const prefix = getAdmissionNumberPrefix(session);

  // max + 1 is always greater than every existing number for the prefix, so it's unique.
  const max = await getHighestAdmissionSequence(prefix);

  return formatAdmissionNumber(prefix, max + 1);
};
