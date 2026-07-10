import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { EmailJobData } from "./emailQueue";
import {
  sendTaskAssignedEmail,
  sendTaskCompletedEmail,
  sendDeadlineReminderEmail,
} from "../services/emailService";

const worker = new Worker<EmailJobData, any, string>(
  "email",
  async (job) => {
    const { data } = job;

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
        throw new Error(`Unknown job type`);
    }

    console.log(`✅ [${data.type}] → ${data.to}`);
  },
  {
    connection: redisConnection as any,
    concurrency: 5,
  },
);

worker.on("failed", (job, err) => {
  console.error(`❌ Job ${job?.id} (${job?.data.type}) failed:`, err.message);
});

export default worker;
