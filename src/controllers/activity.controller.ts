import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  ActivityCreateSchema,
  ActivityEditSchema,
} from "../schemas/activity.schema";
import ExcelJS from "exceljs";
import { stripHtml } from "../utils/string";
import { emailQueue } from "../queues/emailQueue";
import { telegramQueue } from "../queues/telegramQueue";

const ActivityController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const where: any = {
        userId: req.user!.id,
      };

      const activities = await prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedBy: { select: { id: true, username: true } },
          user: { select: { id: true, username: true } },
        },
      });
      return successResponse(
        res,
        "Data aktivitas berhasil diambil",
        activities,
      );
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data aktivitas", 500, error);
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const status = req.query.status as string;

      const skip = (page - 1) * limit;

      const where: any = {
        userId: req.user!.id,
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (projectId && projectId.trim() !== "") {
        where.projectId = projectId;
      }
      if (status && status.trim() !== "") {
        where.status = status;
      }

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedBy: { select: { id: true, username: true } },
            user: { select: { id: true, username: true } },
          },
        }),
        prisma.activity.count({ where }),
      ]);

      return successResponse(res, "Data aktivitas berhasil diambil", {
        result: activities,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data aktivitas", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const roles = req.user?.roles || [];
      const isAdmin =
        roles.includes("71504c7f-1475-4099-bf11-7b8b8b6c45f6") ||
        roles.includes("9c3c12f0-1a22-4212-bf9e-83ccde27c814");

      const activity = await prisma.activity.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedBy: { select: { id: true, username: true } },
          user: { select: { id: true, username: true } },
        },
      });

      if (!activity) {
        return errorResponse(res, "Aktivitas tidak ditemukan", 404);
      }

      if (!isAdmin && activity.userId !== req.user!.id) {
        return errorResponse(
          res,
          "Anda tidak memiliki akses ke aktivitas ini",
          403,
        );
      }

      return successResponse(res, "Detail aktivitas", activity);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail aktivitas", 500, error);
    }
  },
  create: async (req: Request, res: Response) => {
    try {
      const parsed = ActivityCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const {
        projectId,
        assignedById,
        title,
        description,
        startDatetime,
        endDatetime,
        status,
      } = parsed.data;

      const pId = projectId && projectId.trim() !== "" ? projectId : null;
      const aId =
        assignedById && assignedById.trim() !== "" ? assignedById : null;

      if (pId) {
        const projectExists = await prisma.project.findUnique({
          where: { id: pId },
        });
        if (!projectExists)
          return errorResponse(res, "Proyek tidak ditemukan", 404);
      }

      // Jika ada pemberi tugas (assignedById), catat sebagai Penugasan (Assignment)
      if (aId) {
        if (!pId) {
          return errorResponse(
            res,
            "Proyek wajib dipilih jika tugas diberikan oleh orang lain",
            400,
          );
        }

        const supervisor = await prisma.authUser.findUnique({
          where: { id: aId },
        });
        if (!supervisor) {
          return errorResponse(res, "Pemberi tugas tidak ditemukan", 404);
        }

        const assignment = await prisma.assignment.create({
          data: {
            projectId: pId,
            assignedById: aId,
            assignedToId: req.user!.id,
            title,
            description: description || null,
            startDatetime: new Date(startDatetime),
            endDatetime: new Date(endDatetime),
            status: (status as any) || "PENDING",
            createdBy: req.user!.id,
            completedAt:
              status &&
              ["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"].includes(
                status,
              )
                ? new Date()
                : null,
          },
        });

        // Kirim notifikasi ke atasan jika langsung ditandai selesai
        if (
          status === "COMPLETED" ||
          status === "COMPLETED_LATE" ||
          status === "LATE_WITH_REASON"
        ) {
          if (supervisor.notifyEmail) {
            await emailQueue.add("task-completed", {
              type: "task-completed",
              taskId: assignment.id,
              to: supervisor.email,
              supervisorName: supervisor.username,
              employeeName: req.user!.username,
              taskTitle: title,
              completedAt: new Date().toISOString(),
            });
          }

          if (supervisor.notifyTelegram && supervisor.telegramChatId) {
            const completedDateStr = new Date().toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              dateStyle: "medium",
              timeStyle: "short",
            });
            const cleanDesc = description ? description.replace(/<[^>]*>/g, "").trim() : "Tidak ada deskripsi";
            const displayDesc = cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + "..." : cleanDesc;
            const appUrl = process.env.APP_URL || "http://localhost:5173";
            const link = `${appUrl}/assignments/${assignment.id}`;

            await telegramQueue.add("task-completed", {
              chatId: supervisor.telegramChatId,
              message: `✅ <b>TUGAS SELESAI (DARI AKTIVITAS)</b>\n\nHalo <b>${supervisor.username}</b>,\nTugas "<b>${title}</b>" telah diselesaikan oleh <b>${req.user!.username}</b>.\n\nDeskripsi: <i>${displayDesc}</i>\nStatus Baru: <b>${status}</b>\nWaktu Selesai: <b>${completedDateStr} WIB</b>\n\nSilakan periksa pekerjaan tersebut di aplikasi web.`,
              link,
            });
          }
        }

        return successResponse(
          res,
          "Tugas berhasil dicatat ke Penugasan",
          assignment,
          201,
        );
      }

      // Jika mandiri (tidak ada pemberi tugas), catat sebagai Aktivitas Saya (Activity)
      const activity = await prisma.activity.create({
        data: {
          userId: req.user!.id,
          projectId: pId,
          assignedById: null,
          title,
          description: description || null,
          startDatetime: new Date(startDatetime),
          endDatetime: new Date(endDatetime),
          createdBy: req.user!.id,
          status: status || "PENDING",
          completedAt:
            status &&
            ["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"].includes(status)
              ? new Date()
              : null,
        },
      });

      return successResponse(res, "Aktivitas berhasil dibuat", activity, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const parsed = ActivityEditSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const activity = await prisma.activity.findUnique({ where: { id } });
      if (!activity)
        return errorResponse(res, "Aktivitas tidak ditemukan", 404);

      if (activity.userId !== req.user!.id) {
        return errorResponse(
          res,
          "Anda tidak memiliki akses ke aktivitas ini",
          403,
        );
      }

      const {
        projectId,
        assignedById,
        title,
        description,
        startDatetime,
        endDatetime,
        status,
      } = parsed.data;

      const pId = projectId && projectId.trim() !== "" ? projectId : null;
      const aId =
        assignedById && assignedById.trim() !== "" ? assignedById : null;

      if (pId) {
        const projectExists = await prisma.project.findUnique({
          where: { id: pId },
        });
        if (!projectExists)
          return errorResponse(res, "Proyek tidak ditemukan", 404);
      }

      // Jika ada pemberi tugas (assignedById), pindahkan ke Penugasan (Assignment)
      if (aId) {
        const supervisor = await prisma.authUser.findUnique({
          where: { id: aId },
        });
        if (!supervisor) {
          return errorResponse(res, "Pemberi tugas tidak ditemukan", 404);
        }

        const result = await prisma.$transaction(async (tx) => {
          // Hapus dari tabel Activity
          await tx.activity.delete({ where: { id } });

          // Buat baru di tabel Assignment
          const assignment = await tx.assignment.create({
            data: {
              projectId: pId!,
              assignedById: aId,
              assignedToId: req.user!.id,
              title,
              description: description || null,
              startDatetime: new Date(startDatetime),
              endDatetime: new Date(endDatetime),
              status: (status as any) || "PENDING",
              createdBy: req.user!.id,
              completedAt:
                status &&
                ["COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"].includes(
                  status,
                )
                  ? new Date()
                  : null,
            },
          });
          return assignment;
        });

        // Kirim notifikasi ke atasan jika status selesai
        if (
          status === "COMPLETED" ||
          status === "COMPLETED_LATE" ||
          status === "LATE_WITH_REASON"
        ) {
          if (supervisor.notifyEmail) {
            await emailQueue.add("task-completed", {
              type: "task-completed",
              taskId: result.id,
              to: supervisor.email,
              supervisorName: supervisor.username,
              employeeName: req.user!.username,
              taskTitle: title,
              completedAt: new Date().toISOString(),
            });
          }

          if (supervisor.notifyTelegram && supervisor.telegramChatId) {
            const completedDateStr = new Date().toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              dateStyle: "medium",
              timeStyle: "short",
            });
            const cleanDesc = description ? description.replace(/<[^>]*>/g, "").trim() : "Tidak ada deskripsi";
            const displayDesc = cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + "..." : cleanDesc;
            const appUrl = process.env.APP_URL || "http://localhost:5173";
            const link = `${appUrl}/assignments/${result.id}`;

            await telegramQueue.add("task-completed", {
              chatId: supervisor.telegramChatId,
              message: `✅ <b>TUGAS SELESAI (DARI AKTIVITAS)</b>\n\nHalo <b>${supervisor.username}</b>,\nTugas "<b>${title}</b>" telah diselesaikan oleh <b>${req.user!.username}</b>.\n\nDeskripsi: <i>${displayDesc}</i>\nStatus Baru: <b>${status}</b>\nWaktu Selesai: <b>${completedDateStr} WIB</b>\n\nSilakan periksa pekerjaan tersebut di aplikasi web.`,
              link,
            });
          }
        }

        return successResponse(
          res,
          "Aktivitas berhasil dipindahkan ke Penugasan",
          result,
        );
      }

      const dataToUpdate: any = {
        projectId: pId,
        assignedById: null,
        title,
        description: description || null,
        startDatetime: new Date(startDatetime),
        endDatetime: new Date(endDatetime),
        updatedBy: req.user!.id,
      };

      if (status && status !== activity.status) {
        dataToUpdate.status = status;
        if (
          status === "COMPLETED" ||
          status === "COMPLETED_LATE" ||
          status === "LATE_WITH_REASON"
        ) {
          dataToUpdate.completedAt = new Date();
        } else {
          dataToUpdate.completedAt = null;
        }
      }

      const updatedActivity = await prisma.activity.update({
        where: { id },
        data: dataToUpdate,
      });

      return successResponse(
        res,
        "Aktivitas berhasil diperbarui",
        updatedActivity,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const activity = await prisma.activity.findUnique({ where: { id } });
      if (!activity)
        return errorResponse(res, "Aktivitas tidak ditemukan", 404);

      if (activity.userId !== req.user!.id) {
        return errorResponse(
          res,
          "Anda tidak memiliki akses ke aktivitas ini",
          403,
        );
      }

      await prisma.activity.delete({ where: { id } });

      return successResponse(res, "Aktivitas berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Gagal menghapus aktivitas", 500, error);
    }
  },

  getEmployeeActivities: async (req: Request, res: Response) => {
    try {
      const roles = req.user?.roles || [];
      const isAdmin = roles.includes("71504c7f-1475-4099-bf11-7b8b8b6c45f6");
      const isSuperadmin = roles.includes(
        "9c3c12f0-1a22-4212-bf9e-83ccde27c814",
      );

      if (!isAdmin && !isSuperadmin) {
        return errorResponse(res, "Anda tidak memiliki akses ke data ini", 403);
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const status = req.query.status as string;
      const userId = req.query.userId as string;

      const skip = (page - 1) * limit;

      const where: any = {};
      if (userId && userId.trim() !== "") {
        where.userId = userId;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (projectId && projectId.trim() !== "") {
        where.projectId = projectId;
      }
      if (status && status.trim() !== "") {
        where.status = status;
      }

      const [activities, total] = await Promise.all([
        prisma.activity.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedBy: { select: { id: true, username: true } },
            user: { select: { id: true, username: true } },
          },
        }),
        prisma.activity.count({ where }),
      ]);

      return successResponse(res, "Data aktivitas pegawai berhasil diambil", {
        result: activities,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil data aktivitas pegawai",
        500,
        error,
      );
    }
  },

  exportEmployeeActivities: async (req: Request, res: Response) => {
    try {
      const roles = req.user?.roles || [];
      const isAdmin = roles.includes("71504c7f-1475-4099-bf11-7b8b8b6c45f6");
      const isSuperadmin = roles.includes(
        "9c3c12f0-1a22-4212-bf9e-83ccde27c814",
      );

      if (!isAdmin && !isSuperadmin) {
        return errorResponse(res, "Anda tidak memiliki akses ke data ini", 403);
      }

      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const status = req.query.status as string;
      const userId = req.query.userId as string;
      const yearly = req.query.yearly === "true";
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();

      const where: any = {};
      if (userId && userId.trim() !== "") {
        where.userId = userId;
      }

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (projectId && projectId.trim() !== "") {
        where.projectId = projectId;
      }
      if (status && status.trim() !== "") {
        where.status = status;
      }

      const workbook = new ExcelJS.Workbook();

      // Common helper to populate a worksheet
      const populateWorksheet = (worksheet: any, data: any[]) => {
        if (data && data.length > 0) {
          data.sort((a, b) => {
            const userA = a.user?.username || "";
            const userB = b.user?.username || "";
            const compUser = userA.localeCompare(userB);
            if (compUser !== 0) return compUser;

            const timeA = new Date(a.startDatetime).getTime();
            const timeB = new Date(b.startDatetime).getTime();
            return timeA - timeB;
          });
        }

        worksheet.columns = [
          { header: "No", key: "no", width: 8 },
          { header: "Tanggal", key: "tanggal", width: 15 },
          { header: "Nama Pegawai", key: "namaPegawai", width: 25 },
          { header: "Judul Aktivitas", key: "judul", width: 35 },
          { header: "Deskripsi", key: "deskripsi", width: 45 },
          { header: "Proyek", key: "proyek", width: 30 },
          { header: "Mulai", key: "mulai", width: 12 },
          { header: "Selesai", key: "selesai", width: 12 },
          { header: "Status", key: "status", width: 18 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;
        headerRow.eachCell((cell: any) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "0D3A69" },
          };
          cell.font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: "FFFFFF" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          cell.border = {
            top: { style: "thin", color: { argb: "D2D2D2" } },
            left: { style: "thin", color: { argb: "D2D2D2" } },
            bottom: { style: "medium", color: { argb: "0A2F55" } },
            right: { style: "thin", color: { argb: "D2D2D2" } },
          };
        });

        if (data.length === 0) {
          const emptyRow = worksheet.addRow({
            no: "-",
            tanggal: "-",
            namaPegawai: "-",
            judul: "Tidak ada data aktivitas",
            deskripsi: "-",
            proyek: "-",
            mulai: "-",
            selesai: "-",
            status: "-",
          });
          emptyRow.height = 22;
          emptyRow.eachCell((cell: any) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.font = { name: "Calibri", size: 10, italic: true };
            cell.font.color = { argb: "9CA3AF" };
          });
        } else {
          data.forEach((activity, idx) => {
            const start = new Date(activity.startDatetime);
            const end = new Date(activity.endDatetime);

            const dateStr = start.toLocaleDateString("id-ID", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              timeZone: "Asia/Jakarta",
            });

            const formatTime = (d: Date) => {
              return d.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Asia/Jakarta",
              });
            };

            const rowData = {
              no: idx + 1,
              tanggal: dateStr,
              namaPegawai: activity.user?.username || "-",
              judul: activity.title,
              deskripsi: activity.description
                ? stripHtml(activity.description)
                : "-",
              proyek: activity.project ? activity.project.name : "-",
              mulai: formatTime(start),
              selesai: formatTime(end),
              status: activity.status,
            };

            const row = worksheet.addRow(rowData);
            row.height = 20;

            const isEven = idx % 2 === 0;
            row.eachCell((cell: any, colNumber: number) => {
              cell.alignment = {
                vertical: "middle",
                horizontal:
                  colNumber === 1 ||
                  colNumber === 2 ||
                  colNumber === 7 ||
                  colNumber === 8 ||
                  colNumber === 9
                    ? "center"
                    : "left",
              };
              cell.font = {
                name: "Calibri",
                size: 10,
              };
              cell.border = {
                top: { style: "thin", color: { argb: "E5E7EB" } },
                left: { style: "thin", color: { argb: "E5E7EB" } },
                bottom: { style: "thin", color: { argb: "E5E7EB" } },
                right: { style: "thin", color: { argb: "E5E7EB" } },
              };
              if (isEven) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "F9FAFB" },
                };
              }
            });
          });
        }

        if (data && data.length > 0) {
          worksheet.autoFilter = `A1:I${data.length + 1}`;
        }
      };

      let downloadFilename = "";

      if (yearly) {
        // Yearly multi-sheet export
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

        where.startDatetime = {
          gte: startOfYear,
          lte: endOfYear,
        };

        const activities = await prisma.activity.findMany({
          where,
          orderBy: { startDatetime: "asc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedBy: { select: { id: true, username: true } },
            user: { select: { id: true, username: true } },
          },
        });

        // Group activities by month index (0 to 11)
        const activitiesByMonth = Array.from(
          { length: 12 },
          () => [] as typeof activities,
        );
        activities.forEach((activity) => {
          const monthIndex = new Date(activity.startDatetime).getMonth();
          activitiesByMonth[monthIndex].push(activity);
        });

        const monthNames = [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ];

        monthNames.forEach((monthName, monthIdx) => {
          const sheetName = `${monthName} ${year}`;
          const worksheet = workbook.addWorksheet(sheetName);
          populateWorksheet(worksheet, activitiesByMonth[monthIdx]);
        });

        downloadFilename = `Laporan Aktivitas Pegawai Tahun ${year}.xlsx`;
      } else {
        // Normal single-sheet export (sesuai filter)
        const activities = await prisma.activity.findMany({
          where,
          orderBy: { startDatetime: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedBy: { select: { id: true, username: true } },
            user: { select: { id: true, username: true } },
          },
        });

        const worksheet = workbook.addWorksheet("Aktivitas Pegawai");
        populateWorksheet(worksheet, activities);

        downloadFilename = `Laporan Aktivitas Pegawai.xlsx`;
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${downloadFilename}`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengekspor data aktivitas pegawai",
        500,
        error,
      );
    }
  },

  exportMyActivities: async (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const status = req.query.status as string;
      const yearly = req.query.yearly === "true";
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();

      // Restrict only to the logged in user's activities
      const where: any = {
        userId: req.user!.id,
      };

      if (search) {
        where.OR = [
          { title: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ];
      }

      if (projectId && projectId.trim() !== "") {
        where.projectId = projectId;
      }
      if (status && status.trim() !== "") {
        where.status = status;
      }

      const workbook = new ExcelJS.Workbook();

      // Common helper to populate a worksheet
      const populateWorksheet = (worksheet: any, data: any[]) => {
        if (data && data.length > 0) {
          data.sort((a, b) => {
            const timeA = new Date(a.startDatetime).getTime();
            const timeB = new Date(b.startDatetime).getTime();
            return timeA - timeB;
          });
        }

        worksheet.columns = [
          { header: "No", key: "no", width: 8 },
          { header: "Tanggal", key: "tanggal", width: 15 },
          { header: "Nama Pegawai", key: "namaPegawai", width: 25 },
          { header: "Judul Aktivitas", key: "judul", width: 35 },
          { header: "Deskripsi", key: "deskripsi", width: 45 },
          { header: "Proyek", key: "proyek", width: 30 },
          { header: "Mulai", key: "mulai", width: 12 },
          { header: "Selesai", key: "selesai", width: 12 },
          { header: "Status", key: "status", width: 18 },
        ];

        const headerRow = worksheet.getRow(1);
        headerRow.height = 28;
        headerRow.eachCell((cell: any) => {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "0D3A69" },
          };
          cell.font = {
            name: "Calibri",
            size: 11,
            bold: true,
            color: { argb: "FFFFFF" },
          };
          cell.alignment = {
            vertical: "middle",
            horizontal: "center",
          };
          cell.border = {
            top: { style: "thin", color: { argb: "D2D2D2" } },
            left: { style: "thin", color: { argb: "D2D2D2" } },
            bottom: { style: "medium", color: { argb: "0A2F55" } },
            right: { style: "thin", color: { argb: "D2D2D2" } },
          };
        });

        if (data.length === 0) {
          const emptyRow = worksheet.addRow({
            no: "-",
            tanggal: "-",
            namaPegawai: "-",
            judul: "Tidak ada data aktivitas",
            deskripsi: "-",
            proyek: "-",
            mulai: "-",
            selesai: "-",
            status: "-",
          });
          emptyRow.height = 22;
          emptyRow.eachCell((cell: any) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.font = { name: "Calibri", size: 10, italic: true };
            cell.font.color = { argb: "9CA3AF" };
          });
        } else {
          data.forEach((activity, idx) => {
            const start = new Date(activity.startDatetime);
            const end = new Date(activity.endDatetime);

            const dateStr = start.toLocaleDateString("id-ID", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              timeZone: "Asia/Jakarta",
            });

            const formatTime = (d: Date) => {
              return d.toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                hour12: false,
                timeZone: "Asia/Jakarta",
              });
            };

            const rowData = {
              no: idx + 1,
              tanggal: dateStr,
              namaPegawai: activity.user?.username || "-",
              judul: activity.title,
              deskripsi: activity.description
                ? stripHtml(activity.description)
                : "-",
              proyek: activity.project ? activity.project.name : "-",
              mulai: formatTime(start),
              selesai: formatTime(end),
              status: activity.status,
            };

            const row = worksheet.addRow(rowData);
            row.height = 20;

            const isEven = idx % 2 === 0;
            row.eachCell((cell: any, colNumber: number) => {
              cell.alignment = {
                vertical: "middle",
                horizontal:
                  colNumber === 1 ||
                  colNumber === 2 ||
                  colNumber === 7 ||
                  colNumber === 8 ||
                  colNumber === 9
                    ? "center"
                    : "left",
              };
              cell.font = {
                name: "Calibri",
                size: 10,
              };
              cell.border = {
                top: { style: "thin", color: { argb: "E5E7EB" } },
                left: { style: "thin", color: { argb: "E5E7EB" } },
                bottom: { style: "thin", color: { argb: "E5E7EB" } },
                right: { style: "thin", color: { argb: "E5E7EB" } },
              };
              if (isEven) {
                cell.fill = {
                  type: "pattern",
                  pattern: "solid",
                  fgColor: { argb: "F9FAFB" },
                };
              }
            });
          });
        }

        if (data && data.length > 0) {
          worksheet.autoFilter = `A1:I${data.length + 1}`;
        }
      };

      let downloadFilename = "";

      if (yearly) {
        // Yearly multi-sheet export
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

        where.startDatetime = {
          gte: startOfYear,
          lte: endOfYear,
        };

        const activities = await prisma.activity.findMany({
          where,
          orderBy: { startDatetime: "asc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedBy: { select: { id: true, username: true } },
            user: { select: { id: true, username: true } },
          },
        });

        // Group activities by month index (0 to 11)
        const activitiesByMonth = Array.from(
          { length: 12 },
          () => [] as typeof activities,
        );
        activities.forEach((activity) => {
          const monthIndex = new Date(activity.startDatetime).getMonth();
          activitiesByMonth[monthIndex].push(activity);
        });

        const monthNames = [
          "Januari",
          "Februari",
          "Maret",
          "April",
          "Mei",
          "Juni",
          "Juli",
          "Agustus",
          "September",
          "Oktober",
          "November",
          "Desember",
        ];

        monthNames.forEach((monthName, monthIdx) => {
          const sheetName = `${monthName} ${year}`;
          const worksheet = workbook.addWorksheet(sheetName);
          populateWorksheet(worksheet, activitiesByMonth[monthIdx]);
        });

        downloadFilename = `Laporan Aktivitas Saya Tahun ${year}.xlsx`;
      } else {
        // Normal single-sheet export (sesuai filter)
        const activities = await prisma.activity.findMany({
          where,
          orderBy: { startDatetime: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedBy: { select: { id: true, username: true } },
            user: { select: { id: true, username: true } },
          },
        });

        const worksheet = workbook.addWorksheet("Aktivitas Saya");
        populateWorksheet(worksheet, activities);

        downloadFilename = `Laporan Aktivitas Saya.xlsx`;
      }

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename=${downloadFilename}`,
      );

      await workbook.xlsx.write(res);
      res.end();
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengekspor data aktivitas saya",
        500,
        error,
      );
    }
  },
};

export default ActivityController;
