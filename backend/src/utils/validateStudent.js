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

  if (!["UTME", "Direct Entry"].includes(mode_of_entry)) {
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