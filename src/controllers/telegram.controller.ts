import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { redisConnection } from "../config/redis";
import { errorResponse, successResponse } from "../lib/response";
import crypto from "crypto";
import { handleWebhookUpdate } from "../services/telegramBot";
const TelegramController = {
  setupLink: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, "Unauthorized", 401);
      }

      const botUsername = process.env.TELEGRAM_BOT_USERNAME;
      if (!botUsername) {
        return errorResponse(
          res,
          "Telegram Bot Username belum dikonfigurasi di server",
          500,
        );
      }

      const token = crypto.randomUUID();
      const redisKey = `telegram_reg:${token}`;

      // Simpan di redis selama 10 menit
      await redisConnectionzz.set(redisKey, userId, "EX", 600);

      const botUrl = `https://t.me/${botUsername}?start=${token}`;

      return successResponse(res, "Link setup berhasil dibuat", {
        botUrl,
        token,
        expiresIn: 600,
      });
    } catch (error: any) {
      return errorResponse(
        res,
        "Gagal membuat link setup Telegram",
        500,
        error.message,
      );
    }
  },

  status: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, "Unauthorized", 401);
      }

      const user = await prisma.authUser.findUnique({
        where: { id: userId },
        select: {
          telegramChatId: true,
          telegramUsername: true,
          notifyEmail: true,
          notifyTelegram: true,
        },
      });

      if (!user) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      return successResponse(res, "Status Telegram berhasil diambil", {
        linked: !!user.telegramChatId,
        telegramUsername: user.telegramUsername,
        notifyEmail: user.notifyEmail,
        notifyTelegram: user.notifyTelegram,
      });
    } catch (error: any) {
      return errorResponse(
        res,
        "Gagal mengambil status Telegram",
        500,
        error.message,
      );
    }
  },

  disconnect: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, "Unauthorized", 401);
      }

      await prisma.authUser.update({
        where: { id: userId },
        data: {
          telegramChatId: null,
          telegramUsername: null,
          notifyTelegram: false, // Matikan notifikasi telegram jika diputus
        },
      });

      return successResponse(res, "Berhasil memutus tautan Telegram");
    } catch (error: any) {
      return errorResponse(
        res,
        "Gagal memutus tautan Telegram",
        500,
        error.message,
      );
    }
  },

  updatePreferences: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, "Unauthorized", 401);
      }

      const { notifyEmail, notifyTelegram } = req.body;

      if (
        typeof notifyEmail !== "boolean" ||
        typeof notifyTelegram !== "boolean"
      ) {
        return errorResponse(res, "Input tidak valid", 400);
      }

      // Validasi: jika mengaktifkan Telegram tapi belum terhubung
      if (notifyTelegram) {
        const user = await prisma.authUser.findUnique({
          where: { id: userId },
          select: { telegramChatId: true },
        });
        if (!user?.telegramChatId) {
          return errorResponse(
            res,
            "Tautkan akun Telegram terlebih dahulu untuk mengaktifkan notifikasi Telegram",
            400,
          );
        }
      }

      await prisma.authUser.update({
        where: { id: userId },
        data: {
          notifyEmail,
          notifyTelegram,
        },
      });

      return successResponse(res, "Pengaturan notifikasi berhasil disimpan");
    } catch (error: any) {
      return errorResponse(
        res,
        "Gagal menyimpan pengaturan notifikasi",
        500,
        error.message,
      );
    }
  },

  webhook: async (req: Request, res: Response) => {
    try {
      const update = req.body;
      if (update) {
        await handleWebhookUpdate(update);
      }
      return res.sendStatus(200);
    } catch (error: any) {
      console.error("❌ Webhook error:", error.message);
      return res.sendStatus(200); // Selalu kirim 200 ke Telegram agar tidak dikirim ulang terus
    }
  },
};

export default TelegramController;
