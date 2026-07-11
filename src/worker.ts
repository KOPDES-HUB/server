import dotenv from "dotenv";
import path from "path";

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import cron from "node-cron";
import { prisma } from "./lib/prisma";
import { addEmailJob } from "./queues/emailQueue";
import emailWorker from "./queues/emailWorker";
import { addTelegramJob } from "./queues/telegramQueue";
import telegramWorker from "./queues/telegramWorker";

console.log("🚀 Starting background worker...");

if (emailWorker) {
  emailWorker.on("ready", () => {
    console.log("✅ Email BullMQ Worker is ready to process jobs");
  });
}

if (telegramWorker) {
  telegramWorker.on("ready", () => {
    console.log("✅ Telegram BullMQ Worker is ready to process jobs");
  });
}

// Cron job running every 1 minute to check for deadlines 10 minutes away
cron.schedule("* * * * *", async () => {
  console.log("⏰ Running deadline reminder check...");
  try {
    const now = new Date();
    const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000);

    // Find assignments that are pending/in progress, deadline within 10 minutes, and not yet reminded
    const upcomingAssignments = await prisma.assignment.findMany({
      where: {
        status: {
          notIn: ["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"],
        },
        deadlineEmailSent: false,
        endDatetime: {
          lte: tenMinutesFromNow,
          gt: now, // Only notify for deadlines in the future (not already passed)
        },
      },
      include: {
        assignedTo: {
          select: {
            email: true,
            username: true,
            telegramChatId: true,
            notifyEmail: true,
            notifyTelegram: true,
          },
        },
      },
    });

    if (upcomingAssignments.length === 0) {
      return;
    }

    console.log(
      `Found ${upcomingAssignments.length} assignment(s) near deadline. Sending reminders...`,
    );

    for (const assignment of upcomingAssignments) {
      try {
        // Queue Email reminder if preference is enabled
        if (assignment.assignedTo.notifyEmail) {
          await addEmailJob("deadline-reminder", {
            type: "deadline-reminder",
            taskId: assignment.id,
            to: assignment.assignedTo.email,
            employeeName: assignment.assignedTo.username,
            taskTitle: assignment.title,
            deadline: assignment.endDatetime.toISOString(),
          });
          console.log(
            `✉️ Queued email deadline reminder for: ${assignment.assignedTo.email} (Task: "${assignment.title}")`,
          );
        }

        // Queue Telegram reminder if chatId exists and preference is enabled
        if (
          assignment.assignedTo.notifyTelegram &&
          assignment.assignedTo.telegramChatId
        ) {
          const dateStr = assignment.endDatetime.toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short",
          });
          const cleanDesc = assignment.description
            ? assignment.description.replace(/<[^>]*>/g, "").trim()
            : "Tidak ada deskripsi";
          const displayDesc = cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + "..." : cleanDesc;
          const appUrl = process.env.APP_URL || "http://localhost:5173";
          const link = `${appUrl}/my-tasks/${assignment.id}`;

          await addTelegramJob("deadline-reminder", {
            chatId: assignment.assignedTo.telegramChatId,
            message: `⏰ <b>PENGINGAT DEADLINE</b>\n\nHalo <b>${assignment.assignedTo.username}</b>,\nTugas "<b>${assignment.title}</b>" mendekati batas waktu pengerjaan.\n\nDeskripsi: <i>${displayDesc}</i>\nBatas Waktu: <b>${dateStr} WIB</b>\n\nHarap segera menyelesaikan pekerjaan Anda. Terima kasih!`,
            link,
          });
          console.log(
            `✉️ Queued Telegram deadline reminder for: ${assignment.assignedTo.telegramChatId}`,
          );
        }

        // Mark as sent
        await prisma.assignment.update({
          where: { id: assignment.id },
          data: { deadlineEmailSent: true },
        });

        console.log(
          `✉️ Queued email deadline reminder for: ${assignment.assignedTo.email} (Task: "${assignment.title}")`,
        );
      } catch (err: any) {
        console.error(
          `❌ Failed to queue deadline reminder for assignment ${assignment.id}:`,
          err.message,
        );
      }
    }
  } catch (error: any) {
    console.error("❌ Error in deadline check cron job:", error.message);
  }
});
