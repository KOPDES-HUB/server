import { Worker } from "bullmq";
import { redisConnection } from "../config/redis";
import { TelegramJobData } from "./telegramQueue";
import { processTelegramJob } from "./processTelegramJob";

const worker = redisConnection
  ? new Worker<TelegramJobData, any, string>(
      "telegram",
      async (job) => {
        await processTelegramJob(job.data);
      },
      {
        connection: redisConnection as any,
        concurrency: 5,
      },
    )
  : null;

if (worker) {
  worker.on("failed", (job, err) => {
    console.error(`❌ Telegram Job ${job?.id} failed:`, err.message);
  });
}

export default worker;
