import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  ProjectCreateSchema,
  ProjectEditSchema,
} from "../schemas/project.schema";

const ProjectController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const projects = await prisma.project.findMany({
        orderBy: { createdAt: "desc" },
        include: { owner: true },
      });
      return successResponse(res, "Data proyek berhasil diambil", projects);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data proyek", 500, error);
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";

      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { code: { contains: search, mode: "insensitive" as any } },
              { name: { contains: search, mode: "insensitive" as any } },
            ],
          }
        : {};

      const [projects, total] = await Promise.all([
        prisma.project.findMany({
          where,
          skip,
          take: limit,
          orderBy: { createdAt: "desc" },
          include: { owner: true },
        }),
        prisma.project.count({ where }),
      ]);

      return successResponse(res, "Data proyek berhasil diambil", {
        result: projects,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data proyek", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const project = await prisma.project.findUnique({
        where: { id },
        include: { owner: true },
      });

      if (!project) return errorResponse(res, "Proyek tidak ditemukan", 404);

      return successResponse(res, "Detail proyek", project);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail proyek", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parsed = ProjectCreateSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const {
        code,
        name,
        description,
        contractStatus,
        category,
        year,
        contractValue,
        contractStart,
        contractEnd,
        ownerId,
      } = parsed.data;

      const exists = await prisma.project.findUnique({ where: { code } });
      if (exists) return errorResponse(res, "Kode proyek sudah digunakan", 409);

      const project = await prisma.project.create({
        data: {
          code,
          name,
          description,
          contractStatus,
          category,
          year,
          contractValue: contractStatus === "CONTRACTED" ? contractValue : null,
          contractStart: contractStatus === "CONTRACTED" ? contractStart : null,
          contractEnd: contractStatus === "CONTRACTED" ? contractEnd : null,
          createdBy: req.user?.id,
          ownerId,
        },
      });

      return successResponse(res, "Proyek berhasil dibuat", project, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const parsed = ProjectEditSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Validasi gagal", 400, parsed.error.format());
      }

      const {
        code,
        name,
        description,
        status,
        contractStatus,
        category,
        year,
        contractValue,
        contractStart,
        contractEnd,
        ownerId,
      } = parsed.data;

      const exists = await prisma.project.findUnique({ where: { id } });
      if (!exists) return errorResponse(res, "Proyek tidak ditemukan", 404);

      if (code !== exists.code) {
        const dup = await prisma.project.findUnique({ where: { code } });
        if (dup) return errorResponse(res, "Kode proyek sudah digunakan", 409);
      }

      const project = await prisma.project.update({
        where: { id },
        data: {
          code,
          name,
          description,
          status,
          contractStatus,
          category,
          year,
          contractValue: contractStatus === "CONTRACTED" ? contractValue : null,
          contractStart: contractStatus === "CONTRACTED" ? contractStart : null,
          contractEnd: contractStatus === "CONTRACTED" ? contractEnd : null,
          updatedBy: req.user?.id,
          ownerId,
        },
      });

      return successResponse(res, "Proyek berhasil diupdate", project);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const { id } = req.params as { id: string };
      const project = await prisma.project.findUnique({ where: { id } });
      if (!project) return errorResponse(res, "Proyek tidak ditemukan", 404);

      await prisma.project.delete({ where: { id } });

      return successResponse(res, "Proyek berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Gagal menghapus proyek", 500, error);
    }
  },
};

export default ProjectController;
