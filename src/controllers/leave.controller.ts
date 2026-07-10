import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  LeaveCreateSchema,
  LeaveStatusUpdateSchema,
} from "../schemas/leave.schema";

const LeaveController = {
  create: async (req: Request, res: Response) => {
    try {
      const parseResult = LeaveCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { managerId, financeId, startDate, endDate, reason } =
        parseResult.data;

      const leave = await prisma.leaveRequest.create({
        data: {
          userId: req.user!.id,
          managerId,
          financeId,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          reason,
          status: "PENDING",
        },
      });

      return successResponse(res, "Pengajuan cuti berhasil dibuat", leave, 201);
    } catch (error) {
      return errorResponse(res, "Gagal membuat pengajuan cuti", 500, error);
    }
  },

  getAll: async (req: Request, res: Response) => {
    try {
      const roles = req.user?.roles || [];
      const isAdmin =
        roles.includes("71504c7f-1475-4099-bf11-7b8b8b6c45f6") ||
        roles.includes("9c3c12f0-1a22-4212-bf9e-83ccde27c814");

      const where: any = {};
      // Pegawai biasa hanya melihat pengajuannya sendiri
      if (!isAdmin) {
        where.userId = req.user!.id;
      }

      const leaves = await prisma.leaveRequest.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          user: { select: { id: true, username: true, email: true } },
          manager: { select: { id: true, username: true } },
          finance: { select: { id: true, username: true } },
        },
      });

      return successResponse(
        res,
        "Data pengajuan cuti berhasil diambil",
        leaves,
      );
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil data pengajuan cuti",
        500,
        error,
      );
    }
  },

  updateStatus: async (req: Request, res: Response) => {
    try {
      const roles = req.user?.roles || [];
      const isAdmin =
        roles.includes("71504c7f-1475-4099-bf11-7b8b8b6c45f6") ||
        roles.includes("9c3c12f0-1a22-4212-bf9e-83ccde27c814");

      const isSuperadmin = roles.includes(
        "9c3c12f0-1a22-4212-bf9e-83ccde27c814",
      );

      if (!isAdmin) {
        return errorResponse(
          res,
          "Hanya admin atau superadmin yang dapat memproses pengajuan cuti",
          403,
        );
      }

      const parseResult = LeaveStatusUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { status, target } = parseResult.data;
      const id = req.params.id as string;

      const leaveRequest = await prisma.leaveRequest.findUnique({
        where: { id },
      });

      if (!leaveRequest) {
        return errorResponse(res, "Pengajuan cuti tidak ditemukan", 404);
      }

      // Check specific authorization for manager and finance targets
      const currentUserId = req.user!.id;
      if (target === "MANAGER") {
        const isAssignedManager = leaveRequest.managerId === currentUserId;
        if (!isAssignedManager && !isSuperadmin) {
          return errorResponse(
            res,
            "Anda tidak memiliki hak untuk menyetujui pengajuan cuti ini sebagai Atasan",
            403,
          );
        }
      } else if (target === "FINANCE") {
        const isAssignedFinance = leaveRequest.financeId === currentUserId;
        if (!isAssignedFinance && !isSuperadmin) {
          return errorResponse(
            res,
            "Anda tidak memiliki hak untuk menyetujui pengajuan cuti ini sebagai Keuangan",
            403,
          );
        }
      }

      // Calculate new statuses
      const updateData: any = {};
      if (target === "MANAGER") {
        updateData.managerStatus = status;
      } else {
        updateData.financeStatus = status;
      }

      const nextManagerStatus =
        target === "MANAGER" ? status : leaveRequest.managerStatus;
      const nextFinanceStatus =
        target === "FINANCE" ? status : leaveRequest.financeStatus;

      // Determine overall status
      if (
        nextManagerStatus === "APPROVED" &&
        nextFinanceStatus === "APPROVED"
      ) {
        updateData.status = "APPROVED";
      } else if (
        nextManagerStatus === "REJECTED" ||
        nextFinanceStatus === "REJECTED"
      ) {
        updateData.status = "REJECTED";
      } else {
        updateData.status = "PENDING";
      }

      const updatedLeave = await prisma.leaveRequest.update({
        where: { id },
        data: updateData,
      });

      const roleText = target === "MANAGER" ? "Atasan" : "Keuangan";
      const statusText = status === "APPROVED" ? "disetujui" : "ditolak";
      return successResponse(
        res,
        `Pengajuan cuti berhasil di-${statusText} oleh ${roleText}`,
        updatedLeave,
      );
    } catch (error) {
      return errorResponse(
        res,
        "Gagal memperbarui status pengajuan cuti",
        500,
        error,
      );
    }
  },
};

export default LeaveController;
