import nodemailer from "nodemailer";

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 465,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    // Menghindari error mismatch sertifikat (misal IP internal 192.168.x.x vs domain sertifikat mail.bit.co.id)
    rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "true",
  },
});

transporter.verify((error) => {
  if (error) console.error("❌ Mailer error:", error);
  else console.log("✅ Mailer siap");
});
