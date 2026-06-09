import sgMail from "@sendgrid/mail";

// SendGrid transactional email. Configure with:
//   SENDGRID_API_KEY  - your SendGrid API key
//   EMAIL_FROM        - a verified SendGrid sender (single sender or domain)
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

export const sendAdmissionLetterEmailService = async ({
  to,
  studentName,
  pdfBuffer,
  fileName,
}) => {
  if (!process.env.SENDGRID_API_KEY) {
    throw new Error("Email is not configured. Set SENDGRID_API_KEY.");
  }

  if (!process.env.EMAIL_FROM) {
    throw new Error(
      "Email sender is not configured. Set EMAIL_FROM to a verified SendGrid sender."
    );
  }

  const message = {
    to,
    from: process.env.EMAIL_FROM,
    subject: "Your Admission Letter from Caleb University",
    html: `
      <p>Dear ${studentName},</p>

      <p>Congratulations. Your admission letter is attached to this email.</p>

      <p>Please download and keep a copy for your records.</p>

      <p>Regards,<br/>Admissions Office</p>
    `,
    attachments: [
      {
        content: Buffer.from(pdfBuffer).toString("base64"),
        filename: fileName,
        type: "application/pdf",
        disposition: "attachment",
      },
    ],
  };

  return sgMail.send(message);
};
