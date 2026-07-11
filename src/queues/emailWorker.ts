import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { EmailJobData } from "./emailQueue";
import { processEmailJob } from "./processEmailJob";

const worker = redisConnection
  ? new Worker<EmailJobData, any, string>(
      "email",
      async (job) => {
        await processEmailJob(job.data);
        console.log(`✅ [${job.data.type}] → ${job.data.to}`);
      },
      {
        connection: redisConnection as any,
        concurrency: 5,
      },
    )
  : null;

if (worker) {
  worker.on("failed", (job, err) => {
    console.error(
      `❌ Job ${job?.id} (${job?.data.type}) failed:`,
      err.message,
    );
  });
}

export default worker;
