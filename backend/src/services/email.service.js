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

  // Trim to guard against a stray space/newline pasted into the env value,
  // which makes SendGrid reject the address as "Invalid from email address".
  const from = process.env.EMAIL_FROM?.trim();

  if (!from) {
    throw new Error(
      "Email sender is not configured. Set EMAIL_FROM to a verified SendGrid sender."
    );
  }

  // Must be a full mailbox (name@domain.tld), not a bare domain or display name.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) {
    throw new Error(
      `EMAIL_FROM is not a valid email address: "${from}". Use a verified sender like admissions@yourdomain.com.`
    );
  }

  const message = {
    to,
    from,
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
