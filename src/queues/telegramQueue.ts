// import { Queue } from "bullmq";
// import { redisConnection } from "../config/redis";

// export type TelegramJobData = {
//   chatId: string;
//   message: string;
//   link?: string;
// };

// export const telegramQueue = new Queue<TelegramJobData, any, string>(
//   "telegram",
//   {
//     connection: redisConnection as any,
//     defaultJobOptions: {
//       attempts: 3,
//       backoff: { type: "exponential", delay: 5000 },
//       removeOnComplete: 100,
//       removeOnFail: 500,
//     },
//   },
// );
