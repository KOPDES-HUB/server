import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import { MenuCreateSchema, MenuEditSchema } from "../schemas/menu.schema";

const MenuController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const menus = await prisma.menu.findMany({
        orderBy: {
          createdAt: "asc",
        },
      });

      return successResponse(res, "Data menu berhasil diambil", menus);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data menu", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const menu = await prisma.menu.findFirst({
        where: { id },
      });

      if (!menu) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      return successResponse(res, "Detail menu berhasil diambil", menu);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data menu", 500, error);
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
            OR: [{ name: { contains: search } }, { url: { contains: search } }],
          }
        : {};

      const [menus, total] = await Promise.all([
        prisma.menu.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
        prisma.menu.count({ where }),
      ]);

      return successResponse(res, "Data menu berhasil diambil", {
        result: menus,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      console.log(error);
      return errorResponse(res, "Gagal mengambil data menu", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = MenuCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        name,
        url,
        icon,
        sequence,
        parentId: parent_id,
        module,
        type,
        permId: perm_id,
      } = parseResult.data;

      const existingMenu = await prisma.menu.findFirst({
        where: { name },
        select: { id: true },
      });

      if (existingMenu) {
        return errorResponse(res, "Nama menu sudah terdaftar", 409);
      }

      const result = await prisma.$transaction(async (tx) => {
        const menu = await tx.menu.create({
          data: {
            name,
            url,
            icon,
            sequence,
            parentId: parent_id ? parent_id : null,
            module,
            type,
            permId: perm_id,
            createdAt: new Date(),
          },
          select: {
            id: true,
          },
        });

        return menu;
      });

      return successResponse(res, "Menu berhasil dibuat", result, 201);
    } catch (error: any) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  edit: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const parseResult = MenuEditSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        name,
        url,
        icon,
        sequence,
        parentId: parent_id,
        module,
        type,
        permId: perm_id,
      } = parseResult.data;

      const existingMenu = await prisma.menu.findFirst({
        where: { id },
        select: { id: true },
      });

      if (!existingMenu) {
        return errorResponse(res, "Menu tidak ditemukan", 404);
      }

      const duplicateMenu = await prisma.menu.findFirst({
        where: {
          name,
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicateMenu) {
        return errorResponse(res, "Nama menu sudah digunakan", 409);
      }

      const result = await prisma.$transaction(async (tx) => {
        const menu = await tx.menu.update({
          where: { id },
          data: {
            name,
            url,
            icon,
            sequence,
            parentId: parent_id ? parent_id : null,
            module,
            type,
            permId: perm_id,
            updatedAt: new Date(),
          },
          select: {
            id: true,
            name: true,
          },
        });

        return menu;
      });

      return successResponse(res, "Menu berhasil diupdate", result);
    } catch (error: any) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const menu = await prisma.menu.findFirst({
        where: { id },
        select: { id: true, name: true, definition: true },
      });

      if (!menu) {
        return errorResponse(res, "Menu tidak ditemukan", 404);
      }

      await prisma.$transaction([
        prisma.menu.deleteMany({
          where: { id: id },
        }),
      ]);

      return successResponse(res, `Menu ${menu.definition} berhasil dihapus`);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },
};

export default MenuController;
