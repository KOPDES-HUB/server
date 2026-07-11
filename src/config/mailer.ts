import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";

const PLACEHOLDER_SMTP_HOSTS = new Set(["mail.contoh.id", "smtp.example.com"]);

export function isSmtpEnabled(): boolean {
  const flag = process.env.SMTP_ENABLED?.toLowerCase();
  if (flag === "false" || flag === "0") return false;
  if (flag === "true" || flag === "1") return true;

  const host = process.env.SMTP_HOST?.trim();
  if (!host || PLACEHOLDER_SMTP_HOSTS.has(host)) return false;

  return Boolean(process.env.SMTP_USER?.trim() && process.env.SMTP_PASS?.trim());
}

function createTransporter(): Transporter | null {
  if (!isSmtpEnabled()) {
    console.log("ℹ️ SMTP disabled. Email notifications will be skipped.");
    return null;
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: process.env.SMTP_TLS_REJECT_UNAUTHORIZED === "true",
    },
  });
}

export const transporter = createTransporter();

if (transporter) {
  transporter.verify((error) => {
    if (error) console.error("❌ Mailer error:", error.message);
    else console.log("✅ Mailer siap");
  });
}
