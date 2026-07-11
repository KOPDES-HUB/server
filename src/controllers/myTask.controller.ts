import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import { AssignmentStatusSchema } from "../schemas/assignment.schema";
import { addEmailJob } from "../queues/emailQueue";
import { addTelegramJob } from "../queues/telegramQueue";

const MyTaskController = {
  getMyTasks: async (req: Request, res: Response) => {
    try {
      const status = req.query.status as string | undefined;
      const projectId = req.query.project_id as string | undefined;
      const assignedBy = req.query.assigned_by as string | undefined;

      const where: any = {
        assignedToId: req.user!.id,
      };

      if (status) {
        where.status = status;
      }

      if (projectId) {
        where.projectId = projectId;
      }

      if (assignedBy) {
        where.assignedById = assignedBy;
      }

      const tasks = await prisma.assignment.findMany({
        where,
        orderBy: { endDatetime: "desc" },
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedBy: { select: { id: true, username: true } },
          logs: {
            orderBy: { changedAt: "desc" },
            include: { changedBy: { select: { id: true, username: true } } },
          },
        },
      });

      return successResponse(res, "Data tugas saya berhasil diambil", tasks);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data tugas", 500, error);
    }
  },

  getMyTasksByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const status = req.query.status as string | undefined;
      const projectId = req.query.project_id as string | undefined;
      const assignedBy = req.query.assigned_by as string | undefined;

      const skip = (page - 1) * limit;

      const where: any = {
        assignedToId: req.user!.id,
      };

      if (status) where.status = status;
      if (projectId) where.projectId = projectId;
      if (assignedBy) where.assignedById = assignedBy;

      const [tasks, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { endDatetime: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedBy: { select: { id: true, username: true } },
            logs: {
              orderBy: { changedAt: "desc" },
              include: { changedBy: { select: { id: true, username: true } } },
            },
          },
        }),
        prisma.assignment.count({ where }),
      ]);

      return successResponse(res, "Data tugas saya berhasil diambil", {
        result: tasks,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data tugas", 500, error);
    }
  },

  getTaskDetail: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const task = await prisma.assignment.findFirst({
        where: { id, assignedToId: req.user!.id },
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedBy: { select: { id: true, username: true } },
          logs: {
            orderBy: { changedAt: "desc" },
            include: { changedBy: { select: { id: true, username: true } } },
          },
        },
      });

      if (!task) return errorResponse(res, "Tugas tidak ditemukan", 404);

      return successResponse(res, "Detail tugas", task);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail tugas", 500, error);
    }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const parsed = AssignmentStatusSchema.safeParse(req.body);

      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const { status, note } = parsed.data;

      const task = await prisma.assignment.findFirst({
        where: { id, assignedToId: req.user!.id },
        include: {
          assignedBy: {
            select: {
              id: true,
              username: true,
              email: true,
              telegramChatId: true,
              notifyEmail: true,
              notifyTelegram: true,
            },
          },
          assignedTo: { select: { id: true, username: true, email: true } },
        },
      });

      if (!task) return errorResponse(res, "Tugas tidak ditemukan", 404);

      const dataToUpdate: any = {
        status,
        updatedBy: req.user!.id,
      };

      if (
        status === "COMPLETED" ||
        status === "COMPLETED_LATE" ||
        status === "LATE_WITH_REASON"
      ) {
        dataToUpdate.completedAt = new Date();
      } else {
        dataToUpdate.completedAt = null;
      }

      const result = await prisma.$transaction(async (tx: any) => {
        const updatedTask = await tx.assignment.update({
          where: { id },
          data: dataToUpdate,
        });

        await tx.assignmentLog.create({
          data: {
            assignmentId: id,
            changedById: req.user!.id,
            oldStatus: task.status as any,
            newStatus: status as any,
            note: note && note.trim() ? note.trim() : null,
          },
        });

        return updatedTask;
      });

      // Send notification to the assigner
      await prisma.notification.create({
        data: {
          userId: task.assignedById,
          title: "Status Tugas Diperbarui",
          message: `Pegawai telah memperbarui status tugas "${task.title}" menjadi ${status}.`,
          link: `/assignments/${task.id}`,
        },
      });

      // Send notifications for task completion
      if (
        status === "COMPLETED" ||
        status === "COMPLETED_LATE" ||
        status === "LATE_WITH_REASON"
      ) {
        if (task.assignedBy.notifyEmail) {
          await addEmailJob("task-completed", {
            type: "task-completed",
            taskId: task.id,
            to: task.assignedBy.email,
            supervisorName: task.assignedBy.username,
            employeeName: task.assignedTo.username,
            taskTitle: task.title,
            completedAt: new Date().toISOString(),
          });
        }

        if (task.assignedBy.notifyTelegram && task.assignedBy.telegramChatId) {
          const completedDateStr = new Date().toLocaleString("id-ID", {
            timeZone: "Asia/Jakarta",
            dateStyle: "medium",
            timeStyle: "short",
          });
          const cleanDesc = task.description ? task.description.replace(/<[^>]*>/g, "").trim() : "Tidak ada deskripsi";
          const displayDesc = cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + "..." : cleanDesc;
          const appUrl = process.env.APP_URL || "http://localhost:5173";
          const link = `${appUrl}/assignments/${task.id}`;

          await addTelegramJob("task-completed", {
            chatId: task.assignedBy.telegramChatId,
            message: `✅ <b>TUGAS SELESAI</b>\n\nHalo <b>${task.assignedBy.username}</b>,\nTugas "<b>${task.title}</b>" telah diselesaikan oleh <b>${task.assignedTo.username}</b>.\n\nDeskripsi: <i>${displayDesc}</i>\nStatus Baru: <b>${status}</b>\nWaktu Selesai: <b>${completedDateStr} WIB</b>${note ? `\nCatatan: <i>${note}</i>` : ""}\n\nSilakan periksa pekerjaan tersebut di aplikasi web.`,
            link,
          });
        }
      }

      return successResponse(res, "Status tugas berhasil diperbarui", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default MyTaskController;
