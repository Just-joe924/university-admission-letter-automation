// Settings for the bulk student import (CSV / Excel). Change the limits here.

export const IMPORT_MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const IMPORT_MAX_ROWS = 2000;
export const IMPORT_ALLOWED_EXTENSIONS = [".csv", ".xlsx", ".xls"];

// How many values go into each `in (...)` duplicate lookup, so request URLs
// stay well within PostgREST limits.
export const IMPORT_DB_LOOKUP_CHUNK_SIZE = 100;

// Spreadsheet columns, in template order. `key` is the students table column;
// `aliases` are accepted header spellings, written in normalized form
// (lowercase, with runs of non-alphanumeric characters replaced by "_").
export const IMPORT_COLUMNS = [
  {
    key: "full_name",
    label: "Full name",
    required: true,
    maxLength: 150,
    aliases: ["name", "student_name"],
  },
  {
    key: "email",
    label: "Email",
    required: true,
    maxLength: 254,
    aliases: ["email_address", "e_mail"],
  },
  {
    key: "department",
    label: "Department",
    required: true,
    maxLength: 120,
    aliases: [],
  },
  {
    key: "course",
    label: "Course",
    required: true,
    maxLength: 120,
    aliases: ["course_programme", "programme", "program", "course_of_study"],
  },
  {
    key: "mode_of_entry",
    label: "Mode of entry",
    required: true,
    maxLength: 20,
    aliases: ["entry_mode"],
  },
  {
    key: "application_number",
    label: "Application number",
    required: true,
    maxLength: 50,
    aliases: ["application_no", "app_no"],
  },
  {
    key: "session",
    label: "Session",
    required: true,
    maxLength: 9,
    aliases: ["academic_session"],
  },
  {
    // Optional: auto-generated during import when left blank, like the form.
    key: "admission_number",
    label: "Admission number",
    required: false,
    maxLength: 50,
    aliases: ["admission_no"],
  },
];
