export const validateStudentInput = ({
  full_name,
  email,
  department,
  course,
  mode_of_entry,
  admission_number,
  application_number,
}) => {
  if (
    !full_name ||
    !email ||
    !department ||
    !course ||
    !mode_of_entry ||
    !admission_number ||
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