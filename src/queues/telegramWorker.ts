// import { Worker } from "bullmq";
// import { redisConnection } from "../config/redis";
// import { TelegramJobData } from "./telegramQueue";

// const worker = new Worker<TelegramJobData, any, string>(
//   "telegram",
//   async (job) => {
//     const { chatId, message, link } = job.data;
//     const token = process.env.TELEGRAM_BOT_TOKEN;

//     if (!token) {
//       throw new Error(
//         "TELEGRAM_BOT_TOKEN is not configured in environment variables",
//       );
//     }

//     const url = `https://api.telegram.org/bot${token}/sendMessage`;

//     const body: any = {
//       chat_id: chatId,
//       text: message,
//       parse_mode: "HTML",
//     };

//     if (link) {
//       body.reply_markup = {
//         inline_keyboard: [
//           [
//             {
//               text: "🔗 Klik di sini untuk detail",
//               url: link,
//             },
//           ],
//         ],
//       };
//     }

//     const response = await fetch(url, {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify(body),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(
//         `Telegram API returned status ${response.status}: ${errorText}`,
//       );
//     }
//   },
//   {
//     connection: redisConnection as any,
//     concurrency: 5,
//   },
// );

// worker.on("failed", (job, err) => {
//   console.error(`❌ Telegram Job ${job?.id} failed:`, err.message);
// });

// export default worker;
