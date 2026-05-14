import { 
    getAllEmailLogsService,
    getEmailLogsByStudentIdService,
} from "../services/emailLog.service.js";

export const getAllEmailLogs = async (req, res) => {
  const { data, error } = await getAllEmailLogsService();

  if (error) {
    return res.status(500).json({
      message: "Failed to fetch email logs",
    });
  }

  return res.status(200).json(data);
};

export const getEmailLogsByStudentId = async (req, res) => {
  const { studentId } = req.params;

  const { data, error } = await getEmailLogsByStudentIdService(studentId);

  if (error) {
    return res.status(500).json({
      message: "Failed to fetch student email logs",
    });
  }

  return res.status(200).json(data);
};