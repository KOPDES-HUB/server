import { Queue } from "bullmq";
import { redisConnection } from "../config/redis";
import { processTelegramJob } from "./processTelegramJob";

export type TelegramJobData = {
  chatId: string;
  message: string;
  link?: string;
};

export const telegramQueue = redisConnection
  ? new Queue<TelegramJobData, any, string>("telegram", {
      connection: redisConnection as any,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    })
  : null;

export async function addTelegramJob(
  name: string,
  data: TelegramJobData,
): Promise<void> {
  if (telegramQueue) {
    await telegramQueue.add(name, data);
    return;
  }

  try {
    await processTelegramJob(data);
    console.log(`✅ [telegram:${name}] → ${data.chatId} (direct)`);
  } catch (err: any) {
    console.error(`❌ [telegram:${name}] direct send failed:`, err.message);
  }
}
