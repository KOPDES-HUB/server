import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";

const NotificationController = {
  getMyNotifications: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      const skip = (page - 1) * limit;

      const [notifications, total, unreadCount] = await Promise.all([
        prisma.notification.findMany({
          where: { userId: req.user!.id },
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
        }),
        prisma.notification.count({ where: { userId: req.user!.id } }),
        prisma.notification.count({
          where: { userId: req.user!.id, isRead: false },
        }),
      ]);

      return successResponse(res, "Data notifikasi", {
        result: notifications,
        total,
        unreadCount,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil notifikasi", 500, error);
    }
  },

  markAsRead: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };

      const notification = await prisma.notification.findFirst({
        where: { id, userId: req.user!.id },
      });

      if (!notification)
        return errorResponse(res, "Notifikasi tidak ditemukan", 404);

      await prisma.notification.update({
        where: { id },
        data: { isRead: true },
      });

      return successResponse(res, "Notifikasi ditandai dibaca");
    } catch (error) {
      return errorResponse(res, "Gagal menandai notifikasi", 500, error);
    }
  },

  markAllAsRead: async (req: Request, res: Response) => {
    try {
      await prisma.notification.updateMany({
        where: { userId: req.user!.id, isRead: false },
        data: { isRead: true },
      });

      return successResponse(res, "Semua notifikasi ditandai dibaca");
    } catch (error) {
      return errorResponse(res, "Gagal menandai semua notifikasi", 500, error);
    }
  },
};

export default NotificationController;
