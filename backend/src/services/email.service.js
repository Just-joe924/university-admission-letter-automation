import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: Number(process.env.EMAIL_PORT),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendAdmissionLetterEmailService = async ({
  to,
  studentName,
  pdfBuffer,
  fileName,
}) => {
  const mailOptions = {
    from: process.env.EMAIL_FROM,
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