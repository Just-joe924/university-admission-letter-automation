import { DEPARTMENT_COURSES, DEPARTMENTS } from "../constants/departments.js";
import { MODES_OF_ENTRY } from "../constants/student.js";
import { IMPORT_COLUMNS } from "../constants/studentImport.js";

export const validateStudentInput = ({
  full_name,
  email,
  department,
  course,
  mode_of_entry,
  application_number,
}) => {
  // admission_number is intentionally not required here — it is auto-generated
  // in the controller when left blank.
  if (
    !full_name ||
    !email ||
    !department ||
    !course ||
    !mode_of_entry ||
    !application_number
  ) {
    return {
      valid: false,
      message: "Required fields are missing",
    };
  }

  if (!MODES_OF_ENTRY.includes(mode_of_entry)) {
    return {
      valid: false,
      message: "Mode of entry must be either UTME or Direct Entry",
    };
  }

  return {
    valid: true,
    message: null,
  };
};

const EMAIL_PATTERN =
  /^[A-Za-z0-9._%+'-]+@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
// Identifiers are limited to characters that are safe in database lookups and
// on the printed letter.
const IDENTIFIER_PATTERN = /^[A-Za-z0-9/_.-]+$/;
const SESSION_PATTERN = /^(\d{4})\/(\d{4})$/;

const findCanonical = (value, options) =>
  options.find((option) => option.toLowerCase() === value.toLowerCase());

// Validates one bulk-import record and returns EVERY problem (not just the
// first) as { field, message }. Department, course and mode of entry are
// matched case-insensitively and returned in their canonical spelling, so
// imported records match what the Add Student form would save.
export const validateStudentRecord = (record) => {
  const student = { ...record };
  const errors = [];
  const addError = (field, message) => errors.push({ field, message });
  const hasError = (field) => errors.some((error) => error.field === field);

  for (const { key, label, required, maxLength } of IMPORT_COLUMNS) {
    const value = student[key] ?? "";

    if (required && !value) {
      addError(key, `${label} is required`);
    } else if (value.length > maxLength) {
      addError(key, `${label} must be ${maxLength} characters or fewer`);
    }
  }

  if (student.email && !hasError("email") && !EMAIL_PATTERN.test(student.email)) {
    addError("email", `Email "${student.email}" is not a valid email address`);
  }

  if (student.mode_of_entry && !hasError("mode_of_entry")) {
    const mode = findCanonical(student.mode_of_entry, MODES_OF_ENTRY);

    if (mode) student.mode_of_entry = mode;
    else {
      addError(
        "mode_of_entry",
        `Mode of entry must be either ${MODES_OF_ENTRY.join(" or ")}`
      );
    }
  }

  if (student.department && !hasError("department")) {
    const department = findCanonical(student.department, DEPARTMENTS);

    if (department) student.department = department;
    else {
      addError(
        "department",
        `Department "${student.department}" is not a recognised department`
      );
    }
  }

  // A course can only be checked once the department is known to be valid.
  if (student.course && !hasError("course") && !hasError("department")) {
    const course = findCanonical(
      student.course,
      DEPARTMENT_COURSES[student.department]
    );

    if (course) student.course = course;
    else {
      addError(
        "course",
        `Course "${student.course}" is not offered by the ${student.department} department`
      );
    }
  }

  if (student.session && !hasError("session")) {
    const match = SESSION_PATTERN.exec(student.session);

    if (!match || Number(match[2]) !== Number(match[1]) + 1) {
      addError("session", "Session must be two consecutive years, e.g. 2025/2026");
    }
  }

  for (const [field, label] of [
    ["application_number", "Application number"],
    ["admission_number", "Admission number"],
  ]) {
    if (student[field] && !hasError(field) && !IDENTIFIER_PATTERN.test(student[field])) {
      addError(field, `${label} may only contain letters, numbers and / _ . -`);
    }
  }

  return { valid: errors.length === 0, errors, student };
};
