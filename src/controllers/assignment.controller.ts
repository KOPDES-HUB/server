import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  AssignmentCreateSchema,
  AssignmentEditSchema,
} from "../schemas/assignment.schema";
import ExcelJS from "exceljs";
import { stripHtml } from "../utils/string";
import { addEmailJob } from "../queues/emailQueue";
import { addTelegramJob } from "../queues/telegramQueue";

const AssignmentController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const assignments = await prisma.assignment.findMany({
        where: { assignedById: req.user!.id },
        orderBy: { createdAt: "desc" },
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, username: true } },
          assignedBy: { select: { id: true, username: true } },
          logs: {
            orderBy: { changedAt: "desc" },
            include: { changedBy: { select: { id: true, username: true } } },
          },
        },
      });
      return successResponse(
        res,
        "Data penugasan berhasil diambil",
        assignments,
      );
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data penugasan", 500, error);
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const assignedToId = req.query.assignedToId as string;
      const dateFilter = req.query.dateFilter as string;

      const skip = (page - 1) * limit;

      const where: any = search
        ? {
            OR: [{ title: { contains: search, mode: "insensitive" } }],
          }
        : {};

      const andConditions: any[] = [];
      andConditions.push({ assignedById: req.user!.id });
      if (projectId) andConditions.push({ projectId });
      if (assignedToId) andConditions.push({ assignedToId });

      if (dateFilter) {
        const now = new Date();
        let startLimit: Date | null = null;
        let endLimit: Date | null = null;

        if (dateFilter === "today") {
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff,
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff + 6,
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_month") {
          startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
        } else {
          // Custom date YYYY-MM-DD or range YYYY-MM-DD:YYYY-MM-DD
          const dateRegex = /^(\d{4}-\d{2}-\d{2})(?::(\d{4}-\d{2}-\d{2}))?$/;
          const match = dateFilter.match(dateRegex);
          if (match) {
            const start = new Date(match[1]);
            const end = match[2] ? new Date(match[2]) : start;
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              startLimit = new Date(
                start.getUTCFullYear(),
                start.getUTCMonth(),
                start.getUTCDate(),
                0,
                0,
                0,
              );
              endLimit = new Date(
                end.getUTCFullYear(),
                end.getUTCMonth(),
                end.getUTCDate(),
                23,
                59,
                59,
                999,
              );
            }
          }
        }

        if (startLimit && endLimit) {
          andConditions.push({
            startDatetime: { lte: endLimit },
          });
          andConditions.push({
            endDatetime: { gte: startLimit },
          });
        }
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const [assignments, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedTo: { select: { id: true, username: true } },
            assignedBy: { select: { id: true, username: true } },
            logs: {
              orderBy: { changedAt: "desc" },
              include: { changedBy: { select: { id: true, username: true } } },
            },
          },
        }),
        prisma.assignment.count({ where }),
      ]);

      return successResponse(res, "Data penugasan berhasil diambil", {
        result: assignments,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data penugasan", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const assignment = await prisma.assignment.findUnique({
        where: { id },
        include: {
          project: { select: { id: true, name: true, code: true } },
          assignedTo: { select: { id: true, username: true } },
          assignedBy: { select: { id: true, username: true } },
          logs: {
            orderBy: { changedAt: "desc" },
            include: { changedBy: { select: { id: true, username: true } } },
          },
        },
      });

      if (!assignment)
        return errorResponse(res, "Penugasan tidak ditemukan", 404);

      if (assignment.assignedById !== req.user!.id) {
        return errorResponse(
          res,
          "Anda tidak memiliki akses ke penugasan ini",
          403,
        );
      }

      return successResponse(res, "Detail penugasan", assignment);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail penugasan", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parsed = AssignmentCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        console.log(parsed);
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const {
        projectId,
        assignedToId,
        title,
        description,
        startDatetime,
        endDatetime,
      } = parsed.data;

      // Validate project exists
      const project = await prisma.project.findUnique({
        where: { id: projectId },
      });
      if (!project) return errorResponse(res, "Proyek tidak ditemukan", 404);

      // Validate user exists
      const user = await prisma.authUser.findUnique({
        where: { id: assignedToId },
      });
      if (!user) return errorResponse(res, "Pegawai tidak ditemukan", 404);

      // Check if employee is on approved leave during this period
      const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
          userId: assignedToId,
          status: "APPROVED",
          startDate: {
            lte: new Date(endDatetime),
          },
          endDate: {
            gte: new Date(startDatetime),
          },
        },
      });

      if (overlappingLeave) {
        return errorResponse(
          res,
          "Pegawai tersebut sedang cuti pada periode penugasan tersebut",
          400,
        );
      }

      const assignment = await prisma.assignment.create({
        data: {
          projectId,
          assignedToId,
          assignedById: req.user!.id,
          title,
          description,
          startDatetime: new Date(startDatetime),
          endDatetime: new Date(endDatetime),
          createdBy: req.user!.id,
        },
      });

      // Send notification to the assigned user
      await prisma.notification.create({
        data: {
          userId: assignedToId,
          title: "Tugas Baru",
          message: `Anda ditugaskan pada proyek ${project.name}: ${title}`,
          link: `/my-tasks/${assignment.id}`,
        },
      });

      // Send email notification if preference is enabled
      if (user.notifyEmail) {
        await addEmailJob("task-assigned", {
          type: "task-assigned",
          taskId: assignment.id,
          to: user.email,
          employeeName: user.username,
          taskTitle: title,
          taskDescription: description || "",
          deadline: new Date(endDatetime).toISOString(),
          assignedBy: req.user!.username,
        });
      }

      // Send telegram notification if chatId exists and preference is enabled
      if (user.notifyTelegram && user.telegramChatId) {
        const dateStr = new Date(endDatetime).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
          dateStyle: "medium",
          timeStyle: "short",
        });
        const cleanDesc = description ? description.replace(/<[^>]*>/g, "").trim() : "Tidak ada deskripsi";
        const displayDesc = cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + "..." : cleanDesc;
        const appUrl = process.env.APP_URL || "http://localhost:5173";
        const link = `${appUrl}/my-tasks/${assignment.id}`;

        await addTelegramJob("task-assigned", {
          chatId: user.telegramChatId,
          message: `📋 <b>TUGAS BARU</b>\n\nHalo <b>${user.username}</b>,\nAnda telah ditugaskan oleh <b>${req.user!.username}</b> pada proyek <b>${project.name}</b>.\n\nJudul Tugas: <b>${title}</b>\nDeskripsi: <i>${displayDesc}</i>\nBatas Waktu: <b>${dateStr} WIB</b>\n\nSilakan cek detail tugas di aplikasi web.`,
          link,
        });
      }

      return successResponse(res, "Penugasan berhasil dibuat", assignment, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const parsed = AssignmentEditSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const {
        projectId,
        assignedToId,
        title,
        description,
        startDatetime,
        endDatetime,
        status,
      } = parsed.data;

      const exists = await prisma.assignment.findUnique({
        where: { id },
        include: { project: { select: { name: true } } },
      });
      if (!exists) return errorResponse(res, "Penugasan tidak ditemukan", 404);

      if (exists.assignedById !== req.user!.id) {
        return errorResponse(
          res,
          "Anda tidak diperbolehkan mengupdate penugasan ini",
          403,
        );
      }

      // Check if employee is on approved leave during this period
      const overlappingLeave = await prisma.leaveRequest.findFirst({
        where: {
          userId: assignedToId,
          status: "APPROVED",
          startDate: {
            lte: new Date(endDatetime),
          },
          endDate: {
            gte: new Date(startDatetime),
          },
        },
      });

      if (overlappingLeave) {
        return errorResponse(
          res,
          "Pegawai tersebut sedang cuti pada periode penugasan tersebut",
          400,
        );
      }

      const dataToUpdate: any = {
        projectId,
        assignedToId,
        title,
        description,
        startDatetime: new Date(startDatetime),
        endDatetime: new Date(endDatetime),
        updatedBy: req.user!.id,
      };

      if (status && status !== exists.status) {
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

      const result = await prisma.$transaction(async (tx: any) => {
        const assignment = await tx.assignment.update({
          where: { id },
          data: dataToUpdate,
        });

        if (status && status !== exists.status) {
          await tx.assignmentLog.create({
            data: {
              assignmentId: id,
              changedById: req.user!.id,
              oldStatus: exists.status as any,
              newStatus: status as any,
              note: null,
            },
          });
        }

        return assignment;
      });

      // Send notification if reassigned
      if (assignedToId !== exists.assignedToId) {
        const newUser = await prisma.authUser.findUnique({
          where: { id: assignedToId },
        });
        if (newUser) {
          await prisma.notification.create({
            data: {
              userId: assignedToId,
              title: "Tugas Dialihkan ke Anda",
              message: `Tugas ${title} telah dialihkan ke Anda.`,
              link: `/my-tasks/${result.id}`,
            },
          });

          if (newUser.notifyEmail) {
            await addEmailJob("task-assigned", {
              type: "task-assigned",
              taskId: result.id,
              to: newUser.email,
              employeeName: newUser.username,
              taskTitle: title,
              taskDescription: description || "",
              deadline: new Date(endDatetime).toISOString(),
              assignedBy: req.user!.username,
            });
          }

          if (newUser.notifyTelegram && newUser.telegramChatId) {
            const dateStr = new Date(endDatetime).toLocaleString("id-ID", {
              timeZone: "Asia/Jakarta",
              dateStyle: "medium",
              timeStyle: "short",
            });
            const cleanDesc = description ? description.replace(/<[^>]*>/g, "").trim() : "Tidak ada deskripsi";
            const displayDesc = cleanDesc.length > 200 ? cleanDesc.substring(0, 200) + "..." : cleanDesc;
            const appUrl = process.env.APP_URL || "http://localhost:5173";
            const link = `${appUrl}/my-tasks/${result.id}`;

            await addTelegramJob("task-assigned", {
              chatId: newUser.telegramChatId,
              message: `📋 <b>TUGAS BARU (DIALIHKAN)</b>\n\nHalo <b>${newUser.username}</b>,\nSebuah tugas telah dialihkan ke Anda oleh <b>${req.user!.username}</b> pada proyek <b>${exists.project.name}</b>.\n\nJudul Tugas: <b>${title}</b>\nDeskripsi: <i>${displayDesc}</i>\nBatas Waktu: <b>${dateStr} WIB</b>\n\nSilakan cek detail tugas di aplikasi web.`,
              link,
            });
          }
        }
      }

      return successResponse(res, "Penugasan berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const assignment = await prisma.assignment.findUnique({ where: { id } });
      if (!assignment)
        return errorResponse(res, "Penugasan tidak ditemukan", 404);

      if (assignment.assignedById !== req.user!.id) {
        return errorResponse(
          res,
          "Anda tidak diperbolehkan menghapus penugasan ini",
          403,
        );
      }

      await prisma.assignment.delete({ where: { id } });

      return successResponse(res, "Penugasan berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Gagal menghapus penugasan", 500, error);
    }
  },

  exportAssignments: async (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const assignedToId = req.query.assignedToId as string;
      const dateFilter = req.query.dateFilter as string;
      const yearly = req.query.yearly === "true";
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();

      const where: any = search
        ? {
            OR: [{ title: { contains: search, mode: "insensitive" } }],
          }
        : {};

      const andConditions: any[] = [];
      andConditions.push({ assignedById: req.user!.id });
      if (projectId) andConditions.push({ projectId });
      if (assignedToId) andConditions.push({ assignedToId });

      const workbook = new ExcelJS.Workbook();

      const populateWorksheet = (worksheet: any, data: any[]) => {
        if (data && data.length > 0) {
          data.sort((a, b) => {
            const userA = a.assignedTo?.username || "";
            const userB = b.assignedTo?.username || "";
            const compUser = userA.localeCompare(userB);
            if (compUser !== 0) return compUser;

            const timeA = a.endDatetime ? new Date(a.endDatetime).getTime() : 0;
            const timeB = b.endDatetime ? new Date(b.endDatetime).getTime() : 0;
            return timeA - timeB;
          });
        }

        worksheet.columns = [
          { header: "No", key: "no", width: 8 },
          { header: "Judul Tugas", key: "judul", width: 30 },
          { header: "Deskripsi", key: "deskripsi", width: 40 },
          { header: "Proyek", key: "proyek", width: 30 },
          { header: "Ditugaskan Ke", key: "ditugaskanKe", width: 25 },
          { header: "Batas Waktu", key: "batasWaktu", width: 20 },
          { header: "Status", key: "status", width: 20 },
          { header: "Catatan Terakhir", key: "catatan", width: 35 },
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

        const getStatusLabel = (status?: string | null) => {
          if (!status) return "";
          switch (status) {
            case "PENDING":
              return "Belum Dikerjakan";
            case "PENDING_STATUS":
              return "Pending";
            case "IN_PROGRESS":
              return "Sedang Dikerjakan";
            case "COMPLETED":
              return "Selesai";
            case "COMPLETED_LATE":
              return "Selesai Terlambat";
            case "LATE_WITH_REASON":
              return "Terlambat dengan Alasan";
            default:
              return status;
          }
        };

        if (data.length === 0) {
          const emptyRow = worksheet.addRow({
            no: "-",
            judul: "Tidak ada data penugasan",
            deskripsi: "-",
            proyek: "-",
            ditugaskanKe: "-",
            batasWaktu: "-",
            status: "-",
            catatan: "-",
          });
          emptyRow.height = 22;
          emptyRow.eachCell((cell: any) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.font = { name: "Calibri", size: 10, italic: true };
            cell.font.color = { argb: "9CA3AF" };
          });
        } else {
          data.forEach((assignment, idx) => {
            const end = assignment.endDatetime
              ? new Date(assignment.endDatetime)
              : null;
            const endStr = end
              ? end.toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Jakarta",
                })
              : "-";

            const notesLog = assignment.logs || [];
            const userNotes = notesLog.filter(
              (log: any) => log.note && log.note.trim() !== "",
            );
            const latestNote = userNotes[0]?.note || "-";

            const rowData = {
              no: idx + 1,
              judul: assignment.title,
              deskripsi: assignment.description
                ? stripHtml(assignment.description)
                : "-",
              proyek: assignment.project ? assignment.project.name : "-",
              ditugaskanKe: assignment.assignedTo?.username || "-",
              batasWaktu: endStr,
              status: getStatusLabel(assignment.status),
              catatan: latestNote !== "-" ? stripHtml(latestNote) : "-",
            };

            const row = worksheet.addRow(rowData);
            row.height = 20;

            const isEven = idx % 2 === 0;
            row.eachCell((cell: any, colNumber: number) => {
              cell.alignment = {
                vertical: "middle",
                horizontal:
                  colNumber === 1 || colNumber === 6 || colNumber === 7
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
          worksheet.autoFilter = `A1:H${data.length + 1}`;
        }
      };

      let downloadFilename = "";

      if (yearly) {
        // Yearly multi-sheet export
        const startOfYear = new Date(year, 0, 1);
        const endOfYear = new Date(year, 11, 31, 23, 59, 59, 999);

        andConditions.push({
          startDatetime: {
            gte: startOfYear,
            lte: endOfYear,
          },
        });

        if (andConditions.length > 0) {
          where.AND = andConditions;
        }

        const assignments = await prisma.assignment.findMany({
          where,
          orderBy: { startDatetime: "asc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedTo: { select: { id: true, username: true } },
            assignedBy: { select: { id: true, username: true } },
            logs: {
              orderBy: { changedAt: "desc" },
              include: { changedBy: { select: { id: true, username: true } } },
            },
          },
        });

        // Group assignments by month index (0 to 11)
        const assignmentsByMonth = Array.from(
          { length: 12 },
          () => [] as typeof assignments,
        );
        assignments.forEach((assignment) => {
          const monthIndex = new Date(assignment.startDatetime).getMonth();
          assignmentsByMonth[monthIndex].push(assignment);
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
          populateWorksheet(worksheet, assignmentsByMonth[monthIdx]);
        });

        downloadFilename = `Laporan Penugasan Karyawan Tahun ${year}.xlsx`;
      } else {
        // Normal single-sheet export (sesuai filter)
        if (dateFilter) {
          const now = new Date();
          let startLimit: Date | null = null;
          let endLimit: Date | null = null;

          if (dateFilter === "today") {
            startLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              0,
              0,
              0,
            );
            endLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              23,
              59,
              59,
              999,
            );
          } else if (dateFilter === "this_week") {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              diff,
              0,
              0,
              0,
            );
            endLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              diff + 6,
              23,
              59,
              59,
              999,
            );
          } else if (dateFilter === "this_month") {
            startLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              1,
              0,
              0,
              0,
            );
            endLimit = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
          } else {
            // Custom date YYYY-MM-DD or range YYYY-MM-DD:YYYY-MM-DD
            const dateRegex = /^(\d{4}-\d{2}-\d{2})(?::(\d{4}-\d{2}-\d{2}))?$/;
            const match = dateFilter.match(dateRegex);
            if (match) {
              const start = new Date(match[1]);
              const end = match[2] ? new Date(match[2]) : start;
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                startLimit = new Date(
                  start.getUTCFullYear(),
                  start.getUTCMonth(),
                  start.getUTCDate(),
                  0,
                  0,
                  0,
                );
                endLimit = new Date(
                  end.getUTCFullYear(),
                  end.getUTCMonth(),
                  end.getUTCDate(),
                  23,
                  59,
                  59,
                  999,
                );
              }
            }
          }

          if (startLimit && endLimit) {
            andConditions.push({
              startDatetime: { lte: endLimit },
            });
            andConditions.push({
              endDatetime: { gte: startLimit },
            });
          }
        }

        if (andConditions.length > 0) {
          where.AND = andConditions;
        }

        const assignments = await prisma.assignment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedTo: { select: { id: true, username: true } },
            assignedBy: { select: { id: true, username: true } },
            logs: {
              orderBy: { changedAt: "desc" },
              include: { changedBy: { select: { id: true, username: true } } },
            },
          },
        });

        const worksheet = workbook.addWorksheet("Daftar Penugasan");
        populateWorksheet(worksheet, assignments);

        downloadFilename = `Laporan Penugasan Karyawan.xlsx`;
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
      return errorResponse(res, "Gagal mengekspor data penugasan", 500, error);
    }
  },

  getReportByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const assignedToId = req.query.assignedToId as string;
      const assignedById = req.query.assignedById as string;
      const dateFilter = req.query.dateFilter as string;

      const skip = (page - 1) * limit;

      const where: any = search
        ? {
            OR: [{ title: { contains: search, mode: "insensitive" } }],
          }
        : {};

      const andConditions: any[] = [];
      if (projectId) andConditions.push({ projectId });
      if (assignedToId) andConditions.push({ assignedToId });
      if (assignedById) andConditions.push({ assignedById });

      if (dateFilter) {
        const now = new Date();
        let startLimit: Date | null = null;
        let endLimit: Date | null = null;

        if (dateFilter === "today") {
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_week") {
          const day = now.getDay();
          const diff = now.getDate() - day + (day === 0 ? -6 : 1);
          startLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff,
            0,
            0,
            0,
          );
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth(),
            diff + 6,
            23,
            59,
            59,
            999,
          );
        } else if (dateFilter === "this_month") {
          startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
          endLimit = new Date(
            now.getFullYear(),
            now.getMonth() + 1,
            0,
            23,
            59,
            59,
            999,
          );
        } else {
          // Custom date YYYY-MM-DD or range YYYY-MM-DD:YYYY-MM-DD
          const dateRegex = /^(\d{4}-\d{2}-\d{2})(?::(\d{4}-\d{2}-\d{2}))?$/;
          const match = dateFilter.match(dateRegex);
          if (match) {
            const start = new Date(match[1]);
            const end = match[2] ? new Date(match[2]) : start;
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
              startLimit = new Date(
                start.getUTCFullYear(),
                start.getUTCMonth(),
                start.getUTCDate(),
                0,
                0,
                0,
              );
              endLimit = new Date(
                end.getUTCFullYear(),
                end.getUTCMonth(),
                end.getUTCDate(),
                23,
                59,
                59,
                999,
              );
            }
          }
        }

        if (startLimit && endLimit) {
          andConditions.push({
            startDatetime: { lte: endLimit },
          });
          andConditions.push({
            endDatetime: { gte: startLimit },
          });
        }
      }

      if (andConditions.length > 0) {
        where.AND = andConditions;
      }

      const [assignments, total] = await Promise.all([
        prisma.assignment.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedTo: { select: { id: true, username: true } },
            assignedBy: { select: { id: true, username: true } },
            logs: {
              orderBy: { changedAt: "desc" },
              include: { changedBy: { select: { id: true, username: true } } },
            },
          },
        }),
        prisma.assignment.count({ where }),
      ]);

      return successResponse(res, "Data laporan penugasan berhasil diambil", {
        result: assignments,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data laporan penugasan", 500, error);
    }
  },

  exportReportAssignments: async (req: Request, res: Response) => {
    try {
      const search = (req.query.search as string) || "";
      const projectId = req.query.projectId as string;
      const assignedToId = req.query.assignedToId as string;
      const assignedById = req.query.assignedById as string;
      const dateFilter = req.query.dateFilter as string;
      const yearly = req.query.yearly === "true";
      const year =
        parseInt(req.query.year as string) || new Date().getFullYear();

      const where: any = search
        ? {
            OR: [{ title: { contains: search, mode: "insensitive" } }],
          }
        : {};

      const andConditions: any[] = [];
      if (projectId) andConditions.push({ projectId });
      if (assignedToId) andConditions.push({ assignedToId });
      if (assignedById) andConditions.push({ assignedById });

      const workbook = new ExcelJS.Workbook();

      const populateWorksheet = (worksheet: any, data: any[]) => {
        if (data && data.length > 0) {
          data.sort((a, b) => {
            const userA = a.assignedTo?.username || "";
            const userB = b.assignedTo?.username || "";
            const compUser = userA.localeCompare(userB);
            if (compUser !== 0) return compUser;

            const timeA = a.endDatetime ? new Date(a.endDatetime).getTime() : 0;
            const timeB = b.endDatetime ? new Date(b.endDatetime).getTime() : 0;
            return timeA - timeB;
          });
        }

        worksheet.columns = [
          { header: "No", key: "no", width: 8 },
          { header: "Judul Tugas", key: "judul", width: 30 },
          { header: "Deskripsi", key: "deskripsi", width: 40 },
          { header: "Proyek", key: "proyek", width: 30 },
          { header: "Pemberi Tugas", key: "pemberiTugas", width: 25 },
          { header: "Ditugaskan Ke", key: "ditugaskanKe", width: 25 },
          { header: "Batas Waktu", key: "batasWaktu", width: 20 },
          { header: "Status", key: "status", width: 20 },
          { header: "Catatan Terakhir", key: "catatan", width: 35 },
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

        const getStatusLabel = (status?: string | null) => {
          if (!status) return "";
          switch (status) {
            case "PENDING":
              return "Belum Dikerjakan";
            case "PENDING_STATUS":
              return "Pending";
            case "IN_PROGRESS":
              return "Sedang Dikerjakan";
            case "COMPLETED":
              return "Selesai";
            case "COMPLETED_LATE":
              return "Selesai Terlambat";
            case "LATE_WITH_REASON":
              return "Terlambat dengan Alasan";
            default:
              return status;
          }
        };

        if (data.length === 0) {
          const emptyRow = worksheet.addRow({
            no: "-",
            judul: "Tidak ada data penugasan",
            deskripsi: "-",
            proyek: "-",
            pemberiTugas: "-",
            ditugaskanKe: "-",
            batasWaktu: "-",
            status: "-",
            catatan: "-",
          });
          emptyRow.height = 22;
          emptyRow.eachCell((cell: any) => {
            cell.alignment = { vertical: "middle", horizontal: "center" };
            cell.font = { name: "Calibri", size: 10, italic: true };
            cell.font.color = { argb: "9CA3AF" };
          });
        } else {
          data.forEach((assignment, idx) => {
            const end = assignment.endDatetime
              ? new Date(assignment.endDatetime)
              : null;
            const endStr = end
              ? end.toLocaleDateString("id-ID", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: false,
                  timeZone: "Asia/Jakarta",
                })
              : "-";

            const notesLog = assignment.logs || [];
            const userNotes = notesLog.filter(
              (log: any) => log.note && log.note.trim() !== "",
            );
            const latestNote = userNotes[0]?.note || "-";

            const rowData = {
              no: idx + 1,
              judul: assignment.title,
              deskripsi: assignment.description
                ? stripHtml(assignment.description)
                : "-",
              proyek: assignment.project ? assignment.project.name : "-",
              pemberiTugas: assignment.assignedBy?.username || "-",
              ditugaskanKe: assignment.assignedTo?.username || "-",
              batasWaktu: endStr,
              status: getStatusLabel(assignment.status),
              catatan: latestNote !== "-" ? stripHtml(latestNote) : "-",
            };

            const row = worksheet.addRow(rowData);
            row.height = 20;

            const isEven = idx % 2 === 0;
            row.eachCell((cell: any, colNumber: number) => {
              cell.alignment = {
                vertical: "middle",
                horizontal:
                  colNumber === 1 || colNumber === 7 || colNumber === 8
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

        andConditions.push({
          startDatetime: {
            gte: startOfYear,
            lte: endOfYear,
          },
        });

        if (andConditions.length > 0) {
          where.AND = andConditions;
        }

        const assignments = await prisma.assignment.findMany({
          where,
          orderBy: { startDatetime: "asc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedTo: { select: { id: true, username: true } },
            assignedBy: { select: { id: true, username: true } },
            logs: {
              orderBy: { changedAt: "desc" },
              include: { changedBy: { select: { id: true, username: true } } },
            },
          },
        });

        // Group assignments by month index (0 to 11)
        const assignmentsByMonth = Array.from(
          { length: 12 },
          () => [] as typeof assignments,
        );
        assignments.forEach((assignment) => {
          const monthIndex = new Date(assignment.startDatetime).getMonth();
          assignmentsByMonth[monthIndex].push(assignment);
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
          populateWorksheet(worksheet, assignmentsByMonth[monthIdx]);
        });

        downloadFilename = `Laporan Penugasan Karyawan Tahun ${year}.xlsx`;
      } else {
        // Normal single-sheet export (sesuai filter)
        if (dateFilter) {
          const now = new Date();
          let startLimit: Date | null = null;
          let endLimit: Date | null = null;

          if (dateFilter === "today") {
            startLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              0,
              0,
              0,
            );
            endLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              now.getDate(),
              23,
              59,
              59,
              999,
            );
          } else if (dateFilter === "this_week") {
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1);
            startLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              diff,
              0,
              0,
              0,
            );
            endLimit = new Date(
              now.getFullYear(),
              now.getMonth(),
              diff + 6,
              23,
              59,
              59,
              999,
            );
          } else if (dateFilter === "this_month") {
            startLimit = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
            endLimit = new Date(
              now.getFullYear(),
              now.getMonth() + 1,
              0,
              23,
              59,
              59,
              999,
            );
          } else {
            // Custom date YYYY-MM-DD or range YYYY-MM-DD:YYYY-MM-DD
            const dateRegex = /^(\d{4}-\d{2}-\d{2})(?::(\d{4}-\d{2}-\d{2}))?$/;
            const match = dateFilter.match(dateRegex);
            if (match) {
              const start = new Date(match[1]);
              const end = match[2] ? new Date(match[2]) : start;
              if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                startLimit = new Date(
                  start.getUTCFullYear(),
                  start.getUTCMonth(),
                  start.getUTCDate(),
                  0,
                  0,
                  0,
                );
                endLimit = new Date(
                  end.getUTCFullYear(),
                  end.getUTCMonth(),
                  end.getUTCDate(),
                  23,
                  59,
                  59,
                  999,
                );
              }
            }
          }

          if (startLimit && endLimit) {
            andConditions.push({
              startDatetime: { lte: endLimit },
            });
            andConditions.push({
              endDatetime: { gte: startLimit },
            });
          }
        }

        if (andConditions.length > 0) {
          where.AND = andConditions;
        }

        const assignments = await prisma.assignment.findMany({
          where,
          orderBy: { createdAt: "desc" },
          include: {
            project: { select: { id: true, name: true, code: true } },
            assignedTo: { select: { id: true, username: true } },
            assignedBy: { select: { id: true, username: true } },
            logs: {
              orderBy: { changedAt: "desc" },
              include: { changedBy: { select: { id: true, username: true } } },
            },
          },
        });

        const worksheet = workbook.addWorksheet("Daftar Penugasan");
        populateWorksheet(worksheet, assignments);

        downloadFilename = `Laporan Penugasan Karyawan.xlsx`;
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
      return errorResponse(res, "Gagal mengekspor data laporan penugasan", 500, error);
    }
  },
};

export default AssignmentController;
