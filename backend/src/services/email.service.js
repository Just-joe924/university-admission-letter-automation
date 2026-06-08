import nodemailer from "nodemailer";

// Build the transporter lazily so we read env vars at send time (after dotenv /
// the host has injected them) and can surface a clear config error.
const buildTransporter = () => {
  const host = process.env.EMAIL_HOST;
  const port = Number(process.env.EMAIL_PORT) || 587;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      "Email is not configured. Set EMAIL_HOST, EMAIL_PORT, EMAIL_USER and EMAIL_PASS."
    );
  }

  return nodemailer.createTransport({
    host,
    port,
    // Port 465 uses implicit TLS (secure: true); 587/25 use STARTTLS (secure: false).
    secure: port === 465,
    auth: { user, pass },
  });
};

export const sendAdmissionLetterEmailService = async ({
  to,
  studentName,
  pdfBuffer,
  fileName,
}) => {
  const transporter = buildTransporter();

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to,
    subject: "Your Admission Letter",
    html: `
      <p>Dear ${studentName},</p>

      <p>Congratulations. Your admission letter is attached to this email.</p>

      <p>Please download and keep a copy for your records.</p>

      <p>Regards,<br/>Admissions Office</p>
    `,
    attachments: [
      {
        filename: fileName,
        content: pdfBuffer,
        contentType: "application/pdf",
      },
    ],
  };

  return transporter.sendMail(mailOptions);
};
