const baseStyle = `
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  max-width: 600px;
  margin: auto;
  background: #ffffff;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid #e5e7eb;
`;

const headerStyle = (color: string) => `
  background: ${color};
  padding: 28px 36px;
  color: white;
`;

const btnStyle = (color: string) => `
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: ${color};
  color: white;
  padding: 10px 20px;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  font-size: 13px;
  margin-top: 8px;
`;
const bodyStyle = `padding: 32px;`;

const footerStyle = `
  padding: 16px 32px;
  background: #f9fafb;
  color: #9ca3af;
  font-size: 12px;
  border-top: 1px solid #e5e7eb;
`;

// ─── 1. Notifikasi penugasan task ke karyawan ───────────────
export const taskAssignedTemplate = (params: {
  taskId: string;
  employeeName: string;
  taskTitle: string;
  taskDescription: string;
  deadline: string;
  assignedBy: string;
}) => `
<div style="${baseStyle}">
  <div style="${headerStyle("#4f46e5")}">
    <h2 style="margin:0;">Kamu Mendapat Tugas Baru</h2>
  </div>
  <div style="${bodyStyle}">
    <p>Hei <strong>${params.employeeName}</strong>,</p>
    <p>Kamu baru saja ditugaskan oleh <strong>${params.assignedBy}</strong>.</p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:10px 14px;font-weight:600;width:40%;">Tugas</td>
        <td style="padding:10px 14px;">${params.taskTitle}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-weight:600;">Deskripsi</td>
        <td style="padding:10px 14px;">${params.taskDescription}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:10px 14px;font-weight:600;">Deadline</td>
        <td style="padding:10px 14px;color:#dc2626;">
          ${new Date(params.deadline).toLocaleString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>
      </tr>
    </table>

    <a href="${process.env.APP_URL}/my-tasks/${params.taskId}" style="${btnStyle("#4f46e5")}">
      Lihat Detail Tugas
    </a>
  </div>
  <div style="${footerStyle}">
    ${process.env.APP_NAME} — Notifikasi otomatis, jangan reply email ini.
  </div>
</div>
`;

// ─── 2. Notifikasi task selesai ke atasan ───────────────────
export const taskCompletedTemplate = (params: {
  taskId: string;
  supervisorName: string;
  employeeName: string;
  taskTitle: string;
  completedAt: string;
}) => `
<div style="${baseStyle}">
  <div style="${headerStyle("#16a34a")}">
    <h2 style="margin:0;">Tugas Telah Diselesaikan</h2>
  </div>
  <div style="${bodyStyle}">
    <p>Hei <strong>${params.supervisorName}</strong>,</p>
    <p>
      <strong>${params.employeeName}</strong> telah menyelesaikan tugasnya.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#f3f4f6;">
        <td style="padding:10px 14px;font-weight:600;width:40%;">Tugas</td>
        <td style="padding:10px 14px;">${params.taskTitle}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-weight:600;">Diselesaikan oleh</td>
        <td style="padding:10px 14px;">${params.employeeName}</td>
      </tr>
      <tr style="background:#f3f4f6;">
        <td style="padding:10px 14px;font-weight:600;">Waktu selesai</td>
        <td style="padding:10px 14px;">
          ${new Date(params.completedAt).toLocaleString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>
      </tr>
    </table>

    <a href="${process.env.APP_URL}/assignments/${params.taskId}" style="${btnStyle("#16a34a")}">
      Lihat & Verifikasi Tugas
    </a>
  </div>
  <div style="${footerStyle}">
    ${process.env.APP_NAME} — Notifikasi otomatis, jangan reply email ini.
  </div>
</div>
`;

// ─── 3. Reminder 10 menit sebelum deadline ──────────────────
export const deadlineReminderTemplate = (params: {
  taskId: string;
  employeeName: string;
  taskTitle: string;
  deadline: string;
}) => `
<div style="${baseStyle}">
  <div style="${headerStyle("#f59e0b")}">
    <h2 style="margin:0;">Deadline Hampir Tiba!</h2>
  </div>
  <div style="${bodyStyle}">
    <p>Hei <strong>${params.employeeName}</strong>,</p>
    <p>
      Tugas <strong>"${params.taskTitle}"</strong> akan berakhir dalam
      <strong style="color:#dc2626;">10 menit lagi</strong>.
    </p>

    <table style="width:100%;border-collapse:collapse;margin:16px 0;">
      <tr style="background:#fef3c7;">
        <td style="padding:10px 14px;font-weight:600;width:40%;">Tugas</td>
        <td style="padding:10px 14px;">${params.taskTitle}</td>
      </tr>
      <tr>
        <td style="padding:10px 14px;font-weight:600;">Deadline</td>
        <td style="padding:10px 14px;color:#dc2626;font-weight:600;">
          ${new Date(params.deadline).toLocaleString("id-ID", {
            weekday: "long",
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </td>
      </tr>
    </table>

    <a href="${process.env.APP_URL}/my-tasks/${params.taskId}" style="${btnStyle("#f59e0b")}">
      Selesaikan Sekarang
    </a>
  </div>
  <div style="${footerStyle}">
    ${process.env.APP_NAME} — Notifikasi otomatis, jangan reply email ini.
  </div>
</div>
`;
