import { Request, Response } from "express";
import { errorResponse, successResponse } from "../lib/response";
import { prisma } from "../lib/prisma";
import {
  PermissionCreateSchema,
  PermissionEditSchema,
} from "../schemas/permission.schema";

const PermissionController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const permissions = await prisma.authPerm.findMany({
        orderBy: {
          createdAt: "asc",
        },
      });

      return successResponse(
        res,
        "Data permission berhasil diambil",
        permissions,
      );
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data permission", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const permission = await prisma.authPerm.findFirst({
        where: { id },
      });

      if (!permission) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      return successResponse(
        res,
        "Detail permission berhasil diambil",
        permission,
      );
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data permission", 500, error);
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const sortBy = (req.query.sortBy as string) || "createdAt";
      const sortOrder =
        (req.query.sortOrder as string) === "desc" ? "desc" : "asc";

      const skip = (page - 1) * limit;

      const where = search
        ? {
            OR: [
              { name: { contains: search } },
              { definition: { contains: search } },
            ],
          }
        : {};

      const [permissions, total] = await Promise.all([
        prisma.authPerm.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
        prisma.authPerm.count({ where }),
      ]);

      return successResponse(res, "Data permission berhasil diambil", {
        result: permissions,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data permission", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = PermissionCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { name, definition } = parseResult.data;

      const existingPermission = await prisma.authPerm.findFirst({
        where: { OR: [{ name }, { definition }] },
        select: { id: true },
      });

      if (existingPermission) {
        return errorResponse(res, "Nama atau Definisi sudah terdaftar", 409);
      }

      const result = await prisma.$transaction(async (tx) => {
        const permission = await tx.authPerm.create({
          data: {
            name,
            definition,
            createdAt: new Date(),
          },
          select: {
            id: true,
          },
        });

        return permission;
      });

      return successResponse(res, "Permission berhasil dibuat", result, 201);
    } catch (error: any) {
      console.log(error);
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  edit: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const parseResult = PermissionEditSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { name, definition } = parseResult.data;

      const existingPermission = await prisma.authPerm.findFirst({
        where: { id },
        select: { id: true },
      });

      if (!existingPermission) {
        return errorResponse(res, "Permission tidak ditemukan", 404);
      }

      const duplicatePermission = await prisma.authPerm.findFirst({
        where: {
          OR: [{ name }, { definition }],
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicatePermission) {
        return errorResponse(res, "Nama atau Definisi sudah digunakan", 409);
      }

      const result = await prisma.$transaction(async (tx) => {
        const permission = await tx.authPerm.update({
          where: { id },
          data: {
            name,
            definition,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
            definition: true,
          },
        });

        return permission;
      });

      return successResponse(res, "Permission berhasil diupdate", result);
    } catch (error: any) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const permission = await prisma.authPerm.findFirst({
        where: { id },
        select: { id: true, name: true, definition: true },
      });

      if (!permission) {
        return errorResponse(res, "Permission tidak ditemukan", 404);
      }

      await prisma.$transaction([
        prisma.authPerm.deleteMany({
          where: { id: id },
        }),
      ]);

      return successResponse(
        res,
        `Permission ${permission.definition} berhasil dihapus`,
      );
    } catch (error) {
      console.log(error);
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },
};

export default PermissionController;
