import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import { deleteApplicationFile } from "../middlewares/upload.middleware";
import {
  ApplicationInfoCreateSchema,
  ApplicationInfoEditSchema,
} from "../schemas/applicationInfo.schema";
import path from "path";

const ApplicationInfoController = {
  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";

      const skip = (page - 1) * limit;

      // Handle search conditions
      const searchNumber = parseInt(search);
      const where: any = search
        ? {
            OR: [
              { namaProyek: { contains: search, mode: "insensitive" } },
              { namaInstansi: { contains: search, mode: "insensitive" } },
              { picClient: { contains: search, mode: "insensitive" } },
              ...(!isNaN(searchNumber) ? [{ tahunProyek: searchNumber }] : []),
            ],
          }
        : {};

      const [infos, total] = await Promise.all([
        prisma.applicationInfo.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: {
            _count: {
              select: { files: true, teamMembers: true },
            },
          },
        }),
        prisma.applicationInfo.count({ where }),
      ]);

      // Map response to match expected frontend structure
      const formattedInfos = infos.map((info) => ({
        id: info.id,
        namaInstansi: info.namaInstansi,
        namaProyek: info.namaProyek,
        tahunProyek: info.tahunProyek,
        picClient: info.picClient,
        picNo: info.picNo,
        fileCount: info._count.files,
        teamCount: info._count.teamMembers,
        createdAt: info.createdAt,
      }));

      return successResponse(res, "Data informasi aplikasi berhasil diambil", {
        result: formattedInfos,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error: any) {
      return errorResponse(
        res,
        "Gagal mengambil data informasi aplikasi",
        500,
        error.message,
      );
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const info = await prisma.applicationInfo.findUnique({
        where: { id },
        include: {
          files: {
            orderBy: { id: "asc" },
          },
          teamMembers: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  email: true,
                  avatar: true,
                },
              },
            },
          },
        },
      });

      if (!info) {
        return errorResponse(
          res,
          "Data informasi aplikasi tidak ditemukan",
          404,
        );
      }

      return successResponse(res, "Detail informasi aplikasi", info);
    } catch (error: any) {
      return errorResponse(
        res,
        "Gagal mengambil detail informasi aplikasi",
        500,
        error.message,
      );
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parsed = ApplicationInfoCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const {
        namaInstansi,
        namaProyek,
        tahunProyek,
        picClient,
        picNo,
        informasiTeknisDev,
        informasiTeknisProd,
        teamIds,
      } = parsed.data;

      const uploadedFiles = (req.files as Express.Multer.File[]) || [];

      const result = await prisma.$transaction(async (tx) => {
        // 1. Create ApplicationInfo
        const appInfo = await tx.applicationInfo.create({
          data: {
            namaInstansi,
            namaProyek,
            tahunProyek,
            picClient,
            picNo,
            informasiTeknisDev,
            informasiTeknisProd,
            createdBy: req.user?.id || "System",
            updatedBy: req.user?.id || "System",
          },
        });

        // 2. Create Team Members relations
        if (teamIds.length > 0) {
          await tx.applicationInfoTeam.createMany({
            data: teamIds.map((userId) => ({
              idInformasiAplikasi: appInfo.id,
              userId: userId,
            })),
          });
        }

        // 3. Create Files records
        if (uploadedFiles.length > 0) {
          await tx.applicationInfoFile.createMany({
            data: uploadedFiles.map((file) => {
              const ext = path.extname(file.originalname).toLowerCase();
              return {
                idInformasiAplikasi: appInfo.id,
                namaFile: file.originalname,
                pathFile: file.path.replace(/\\/g, "/"),
                extension: ext,
                clientName: file.filename,
                fileSize: file.size,
              };
            }),
          });
        }

        return appInfo;
      });

      return successResponse(
        res,
        "Data informasi aplikasi berhasil ditambahkan",
        result,
        201,
      );
    } catch (error: any) {
      // Cleanup uploaded files on failure
      const uploadedFiles = (req.files as Express.Multer.File[]) || [];
      for (const file of uploadedFiles) {
        deleteApplicationFile(file.path);
      }
      return errorResponse(
        res,
        "Terjadi kesalahan internal",
        500,
        error.message,
      );
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const parsed = ApplicationInfoEditSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const exists = await prisma.applicationInfo.findUnique({ where: { id } });
      if (!exists) {
        return errorResponse(
          res,
          "Data informasi aplikasi tidak ditemukan",
          404,
        );
      }

      const {
        namaInstansi,
        namaProyek,
        tahunProyek,
        picClient,
        picNo,
        informasiTeknisDev,
        informasiTeknisProd,
        teamIds,
      } = parsed.data;

      const uploadedFiles = (req.files as Express.Multer.File[]) || [];

      const result = await prisma.$transaction(async (tx) => {
        // 1. Update ApplicationInfo
        const appInfo = await tx.applicationInfo.update({
          where: { id },
          data: {
            namaInstansi,
            namaProyek,
            tahunProyek,
            picClient,
            picNo,
            informasiTeknisDev,
            informasiTeknisProd,
            updatedBy: req.user?.id || "System",
          },
        });

        // 2. Sync Team Members (Delete old and create new ones)
        await tx.applicationInfoTeam.deleteMany({
          where: { idInformasiAplikasi: id },
        });

        if (teamIds.length > 0) {
          await tx.applicationInfoTeam.createMany({
            data: teamIds.map((userId) => ({
              idInformasiAplikasi: id,
              userId: userId,
            })),
          });
        }

        // 3. Add new uploaded files
        if (uploadedFiles.length > 0) {
          await tx.applicationInfoFile.createMany({
            data: uploadedFiles.map((file) => {
              const ext = path.extname(file.originalname).toLowerCase();
              return {
                idInformasiAplikasi: id,
                namaFile: file.originalname,
                pathFile: file.path.replace(/\\/g, "/"),
                extension: ext,
                clientName: file.filename,
                fileSize: file.size,
              };
            }),
          });
        }

        return appInfo;
      });

      return successResponse(
        res,
        "Data informasi aplikasi berhasil diperbarui",
        result,
      );
    } catch (error: any) {
      // Cleanup uploaded files on failure
      const uploadedFiles = (req.files as Express.Multer.File[]) || [];
      for (const file of uploadedFiles) {
        deleteApplicationFile(file.path);
      }
      return errorResponse(
        res,
        "Terjadi kesalahan internal",
        500,
        error.message,
      );
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const info = await prisma.applicationInfo.findUnique({
        where: { id },
        include: { files: true },
      });

      if (!info) {
        return errorResponse(
          res,
          "Data informasi aplikasi tidak ditemukan",
          404,
        );
      }

      // 1. Delete physical files from disk
      for (const file of info.files) {
        if (file.pathFile) {
          deleteApplicationFile(file.pathFile);
        }
      }

      // 2. Delete database record (cascades to application_info_files and application_info_team)
      await prisma.applicationInfo.delete({ where: { id } });

      return successResponse(res, "Data informasi aplikasi berhasil dihapus");
    } catch (error: any) {
      return errorResponse(
        res,
        "Gagal menghapus data informasi aplikasi",
        500,
        error.message,
      );
    }
  },

  deleteFile: async (req: Request, res: Response) => {
    try {
      const { fileId } = req.params as { fileId: string };
      const fileRecord = await prisma.applicationInfoFile.findUnique({
        where: { id: fileId },
      });

      if (!fileRecord) {
        return errorResponse(res, "Berkas tidak ditemukan", 404);
      }

      // 1. Delete physical file
      if (fileRecord.pathFile) {
        deleteApplicationFile(fileRecord.pathFile);
      }

      // 2. Delete from database
      await prisma.applicationInfoFile.delete({
        where: { id: fileId },
      });

      return successResponse(res, "Berkas berhasil dihapus");
    } catch (error: any) {
      return errorResponse(res, "Gagal menghapus berkas", 500, error.message);
    }
  },
};

export default ApplicationInfoController;
