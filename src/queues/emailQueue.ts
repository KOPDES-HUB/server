// import { Queue } from "bullmq";
// import { redisConnection } from "../config/redis";

// export type EmailJobData =
//   | {
//       type: "task-assigned";
//       taskId: string;
//       to: string;
//       employeeName: string;
//       taskTitle: string;
//       taskDescription: string;
//       deadline: string;
//       assignedBy: string;
//     }
//   | {
//       type: "task-completed";
//       taskId: string;
//       to: string;
//       supervisorName: string;
//       employeeName: string;
//       taskTitle: string;
//       completedAt: string;
//     }
//   | {
//       type: "deadline-reminder";
//       taskId: string;
//       to: string;
//       employeeName: string;
//       taskTitle: string;
//       deadline: string;
//     };

// export const emailQueue = new Queue<EmailJobData, any, string>("email", {
//   connection: redisConnection as any,
//   defaultJobOptions: {
//     attempts: 3,
//     backoff: { type: "exponential", delay: 5000 },
//     removeOnComplete: 100,
//     removeOnFail: 500,
//   },
// });
