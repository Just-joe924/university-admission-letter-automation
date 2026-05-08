import {
  createStudentService,
  getAllStudentsService,
  getStudentByIdService,
  updateStudentService,
  deleteStudentService,
  verifyStudentService,
} from "../services/student.service.js";


export const createStudent = async (req, res) => {
  const {
    full_name,
    email,
    department,
    course,
    mode_of_entry,
    admission_number,
    application_number,
  } = req.body;

  if (
    !full_name ||
    !email ||
    !department ||
    !course ||
    !mode_of_entry ||
    !admission_number ||
    !application_number
  ) {
    return res.status(400).json({
      message: "Required fields are missing",
    });
  }

  if (!["UTME", "Direct Entry"].includes(mode_of_entry)) {
    return res.status(400).json({
      message: "Mode of entry must be either UTME or Direct Entry",
    });
  }

  const { data, error } = await createStudentService({
    full_name,
    email,
    department,
    course,
    mode_of_entry,
    admission_number,
    application_number,
  });

  if (error) {
    console.error("Insert student error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "A student with this email, admission number, or application number already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to save student",
    });
  }

  return res.status(201).json({
    message: "Student saved successfully",
    student: data?.[0] || null,
  });
};

export const getAllStudents = async (req, res) => {
  const { data, error } = await getAllStudentsService();

  if (error) {
    return res.status(500).json({
      message: "Failed to fetch students",
    });
  }

  return res.status(200).json(data);
};

export const getStudentById = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await getStudentByIdService(id);

  if (error || !data) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  return res.status(200).json(data);
};

export const updateStudent = async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  if (!updates || Object.keys(updates).length === 0) {
    return res.status(400).json({
      message: "No update fields provided",
    });
  }

  if (
    updates.mode_of_entry &&
    !["UTME", "Direct Entry"].includes(updates.mode_of_entry)
  ) {
    return res.status(400).json({
      message: "Mode of entry must be either UTME or Direct Entry",
    });
  }

  const { data, error } = await updateStudentService(id, updates);

  if (error) {
    console.error("Update student error:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message:
          "A student with this email, admission number, or application number already exists",
      });
    }

    return res.status(500).json({
      message: "Failed to update student",
    });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  return res.status(200).json({
    message: "Student updated successfully",
    student: data[0],
  });
};

export const deleteStudent = async (req, res) => {
  const { id } = req.params;

  const { data, error } = await deleteStudentService(id);

  if (error) {
    return res.status(500).json({
      message: "Failed to delete student",
    });
  }

  if (!data || data.length === 0) {
    return res.status(404).json({
      message: "Student not found",
    });
  }

  return res.status(200).json({
    message: "Student deleted successfully",
  });
};

export const verifyStudent = async (req, res) => {
  const { email, application_number } = req.body;

  if (!email || !application_number) {
    return res.status(400).json({
      message: "Email and application number are required",
    });
  }

  const { data, error } = await verifyStudentService(
    email,
    application_number
  );

  if (error || !data) {
    return res.status(404).json({
      message: "No matching admission record found",
    });
  }

  return res.status(200).json({
    message: "Student verified successfully",
    student: data,
  });
};