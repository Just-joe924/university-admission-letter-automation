import { getStudentByIdService, updateStudentService } from "./student.service.js";
import { getAdmissionLetterByStudentIdService } from "./admissionLetter.service.js";
import { generateAdmissionLetterPDF } from "./pdf.service.js";
import { sendAdmissionLetterEmailService } from "./email.service.js";
import {
  getQueuedEmailLogsService,
  updateEmailLogService,
} from "./emailLog.service.js";

let processing = false;

// SendGrid puts the real failure reason in error.response.body.errors (e.g.
// "The from address does not match a verified Sender Identity"). Surface that
// instead of the generic "Bad Request" so the email log is actionable.
const formatSendError = (err) => {
  const sgErrors = err?.response?.body?.errors;
  if (Array.isArray(sgErrors) && sgErrors.length) {
    return sgErrors.map((e) => e.message).filter(Boolean).join("; ");
  }
  return err?.message || "Unknown error";
};

// Get the letter PDF for a student: prefer the already-uploaded file (cheap),
// fall back to regenerating it with Puppeteer.
const getLetterPdfBuffer = async (student) => {
  const { data: letter } = await getAdmissionLetterByStudentIdService(student.id);

  if (letter?.pdf_url) {
    try {
      const res = await fetch(letter.pdf_url);
      if (res.ok) {
        return Buffer.from(await res.arrayBuffer());
      }
    } catch {
      // fall through to regenerate
    }
  }

  return Buffer.from(await generateAdmissionLetterPDF(student));
};

// Process a batch of queued admission-letter emails.
export const processEmailQueue = async () => {
  if (processing) return;
  processing = true;

  try {
    const { data: jobs, error } = await getQueuedEmailLogsService(5);

    if (error || !jobs || jobs.length === 0) {
      return;
    }

    for (const job of jobs) {
      try {
        const { data: student } = await getStudentByIdService(job.student_id);

        if (!student) {
          await updateEmailLogService(job.id, {
            status: "failed",
            error_message: "Student not found",
          });
          continue;
        }

        const pdfBuffer = await getLetterPdfBuffer(student);
        const fileName = `${student.admission_number || student.id}-admission-letter.pdf`;

        await sendAdmissionLetterEmailService({
          to: job.recipient_email || student.email,
          studentName: student.full_name,
          pdfBuffer,
          fileName,
        });

        await updateEmailLogService(job.id, {
          status: "sent",
          error_message: null,
          sent_at: new Date().toISOString(),
        });

        await updateStudentService(student.id, { email_sent: true });
      } catch (sendError) {
        const reason = formatSendError(sendError);
        console.error("Email job failed:", reason);
        await updateEmailLogService(job.id, {
          status: "failed",
          error_message: reason,
        });
      }
    }
  } finally {
    processing = false;
  }
};

// Start the background poller. Safe on a single instance; the `processing`
// guard prevents overlapping runs.
export const startEmailQueueWorker = (intervalMs = 20000) => {
  setTimeout(() => {
    processEmailQueue().catch((err) =>
      console.error("Email queue error:", err?.message || err)
    );
  }, 5000);

  setInterval(() => {
    processEmailQueue().catch((err) =>
      console.error("Email queue error:", err?.message || err)
    );
  }, intervalMs);
};
