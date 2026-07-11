import { transporter } from "../config/mailer";
import {
  taskAssignedTemplate,
  taskCompletedTemplate,
  deadlineReminderTemplate,
} from "../templates/emailTemplates";

const from = `"${process.env.APP_NAME || "App"}" <${process.env.SMTP_USER || "no-reply@localhost"}>`;

async function sendMailOrSkip(
  options: Parameters<NonNullable<typeof transporter>["sendMail"]>[0],
): Promise<void> {
  if (!transporter) return;
  await transporter.sendMail(options);
}

// ─── 1. Kirim ke karyawan saat ditugaskan ───────────────────
export const sendTaskAssignedEmail = async (params: {
  taskId: string;
  to: string;
  employeeName: string;
  taskTitle: string;
  taskDescription: string;
  deadline: string;
  assignedBy: string;
}) => {
  await sendMailOrSkip({
    from,
    to: params.to,
    subject: `Tugas Baru: ${params.taskTitle}`,
    html: taskAssignedTemplate(params),
  });
};

// ─── 2. Kirim ke atasan saat task selesai ───────────────────
export const sendTaskCompletedEmail = async (params: {
  taskId: string;
  to: string;
  supervisorName: string;
  employeeName: string;
  taskTitle: string;
  completedAt: string;
}) => {
  await sendMailOrSkip({
    from,
    to: params.to,
    subject: `Tugas Selesai: ${params.taskTitle}`,
    html: taskCompletedTemplate(params),
  });
};

// ─── 3. Reminder deadline ke karyawan ───────────────────────
export const sendDeadlineReminderEmail = async (params: {
  taskId: string;
  to: string;
  employeeName: string;
  taskTitle: string;
  deadline: string;
}) => {
  await sendMailOrSkip({
    from,
    to: params.to,
    subject: `Reminder: "${params.taskTitle}" deadline 10 menit lagi!`,
    html: deadlineReminderTemplate(params),
  });
};
