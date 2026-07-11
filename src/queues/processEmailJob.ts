import { EmailJobData } from "./emailQueue";
import {
  sendTaskAssignedEmail,
  sendTaskCompletedEmail,
  sendDeadlineReminderEmail,
} from "../services/emailService";

export async function processEmailJob(data: EmailJobData): Promise<void> {
  switch (data.type) {
    case "task-assigned":
      await sendTaskAssignedEmail(data);
      break;

    case "task-completed":
      await sendTaskCompletedEmail(data);
      break;

    case "deadline-reminder":
      await sendDeadlineReminderEmail(data);
      break;

    default:
      throw new Error("Unknown email job type");
  }
}
