import {
  getTotalStudentsCountService,
  getStudentsCountByModeService,
  getGeneratedLettersCountService,
  getEmailSendingStatusCountByModeService,
  getStudentsByDepartmentsService,
  getRecentStudentsService,
} from "../services/dashboard.service.js";

export const getDashboardStats = async (req, res) => {

  const totalStudentsResult = await getTotalStudentsCountService();

  const utmeStudentsResult = await getStudentsCountByModeService("UTME");

  const directEntryStudentsResult = await getStudentsCountByModeService("Direct Entry");

  const generatedLettersResult = await getGeneratedLettersCountService();

  const sentEmailsResult = await getEmailSendingStatusCountByModeService("sent");

  const pendingEmailsResult = await getEmailSendingStatusCountByModeService("pending");

  const failedEmailsResult = await getEmailSendingStatusCountByModeService("failed");

  const hasError =
    totalStudentsResult.error ||
    utmeStudentsResult.error ||
    directEntryStudentsResult.error ||
    generatedLettersResult.error ||
    sentEmailsResult.error ||
    pendingEmailsResult.error ||
    failedEmailsResult.error;

  if (hasError) {
    return res.status(500).json({
      message: "Failed to fetch dashboard stats",
    });
  }

  return res.status(200).json({
    totalStudents: totalStudentsResult.count,
    utmeStudents: utmeStudentsResult.count,
    directEntryStudents: directEntryStudentsResult.count,
    generatedLetters: generatedLettersResult.count,
    emailsSent: sentEmailsResult.count,
    emailsPending: pendingEmailsResult.count,
    emailsFailed: failedEmailsResult.count,
  });
};

export const getModeOfEntryStats = async (req, res) => {
  const utmeResult = await getStudentsCountByModeService("UTME");
  
  const directEntryResult = await getStudentsCountByModeService("Direct Entry");

  if (utmeResult.error || directEntryResult.error) {
    return res.status(500).json({
      message: "Failed to fetch mode of entry stats",
    });
  }

  return res.status(200).json([
    {
      mode: "UTME",
      count: utmeResult.count,
    },
    {
      mode: "Direct Entry",
      count: directEntryResult.count,
    },
  ]);
};

export const getStudentsByDepartments = async (req, res) => {
  const { data, error } = await getStudentsByDepartmentsService();

  if (error) {
    return res.status(500).json({
      message: "Failed to fetch students grouped by department",
    });
  }

  return res.status(200).json(data);
};

export const getRecentStudents = async (req, res) => {
  const { data, error } = await getRecentStudentsService();

  if (error) {
    return res.status(500).json({
      message: "Failed to fetch recent students",
    });
  }

  return res.status(200).json(data);
};