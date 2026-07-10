import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import { RoleCreateSchema, RoleEditSchema } from "../schemas/role.schema";

const RoleController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const roles = await prisma.authGroup.findMany({
        orderBy: {
          createdAt: "asc",
        },
      });

      return successResponse(res, "Data role berhasil diambil", roles);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data role", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const role = await prisma.authGroup.findFirst({
        where: { id },
      });

      if (!role) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      return successResponse(res, "Detail role berhasil diambil", role);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data role", 500, error);
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

      const [roles, total] = await Promise.all([
        prisma.authGroup.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
        }),
        prisma.authGroup.count({ where }),
      ]);

      return successResponse(res, "Data role berhasil diambil", {
        result: roles,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data role", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = RoleCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { name, definition } = parseResult.data;

      const existingRole = await prisma.authGroup.findFirst({
        where: { OR: [{ name }, { definition }] },
        select: { id: true },
      });

      if (existingRole) {
        return errorResponse(res, "Nama atau Definisi sudah terdaftar", 409);
      }

      const result = await prisma.$transaction(async (tx) => {
        const role = await tx.authGroup.create({
          data: {
            name,
            definition,
            createdAt: new Date(),
          },
          select: {
            id: true,
          },
        });

        return role;
      });

      return successResponse(res, "Role berhasil dibuat", result, 201);
    } catch (error: any) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  edit: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const parseResult = RoleEditSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { name, definition } = parseResult.data;

      const existingRole = await prisma.authGroup.findFirst({
        where: { id },
        select: { id: true },
      });

      if (!existingRole) {
        return errorResponse(res, "Role tidak ditemukan", 404);
      }

      const duplicateRole = await prisma.authGroup.findFirst({
        where: {
          OR: [{ name }, { definition }],
          NOT: { id },
        },
        select: { id: true },
      });

      if (duplicateRole) {
        return errorResponse(res, "Nama atau Definisi sudah digunakan", 409);
      }

      const result = await prisma.$transaction(async (tx) => {
        const role = await tx.authGroup.update({
          where: { id },
          data: {
            name,
            definition,
            updated_at: new Date(),
          },
          select: {
            id: true,
            name: true,
            definition: true,
          },
        });

        return role;
      });

      return successResponse(res, "Role berhasil diupdate", result);
    } catch (error: any) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const role = await prisma.authGroup.findFirst({
        where: { id },
        select: { id: true, name: true, definition: true },
      });

      if (!role) {
        return errorResponse(res, "Role tidak ditemukan", 404);
      }

      await prisma.$transaction([
        prisma.authGroup.deleteMany({
          where: { id: id },
        }),
      ]);

      return successResponse(res, `Role ${role.definition} berhasil dihapus`);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  getPermissions: async (req: Request, res: Response) => {
    try {
      const role_id = req.params.id as string;

      // 1. Ambil semua master permission dan menu terkait
      const allPermissions = await prisma.authPerm.findMany({
        include: {
          menus: {
            orderBy: { sequence: "asc" },
          },
        },
      });

      // 2. Ambil data akses spesifik untuk group_id ini
      // Kita ambil juga field can_create, can_read, dll.
      const assignedPerms = await prisma.authPermToGroup.findMany({
        where: { groupId: role_id },
        select: {
          permId: true,
          canCreate: true,
          canRead: true,
          canUpdate: true,
          canDelete: true,
        },
      });

      // 3. Ubah array assignedPerms menjadi Map untuk pencarian O(1)
      const assignedMap = new Map(assignedPerms.map((p) => [p.permId, p]));

      // 4. Mapping hasil akhir
      const result = allPermissions.map((permission) => {
        const access = assignedMap.get(permission.id);

        const allMenus = permission.menus;
        const parentMenus = allMenus.filter((m) => m.parentId === null);
        const childMenus = allMenus.filter((m) => m.parentId !== null);

        const menuTree = parentMenus.map((parent) => ({
          ...parent,
          children: childMenus.filter((child) => child.parentId === parent.id),
        }));

        return {
          permission: {
            id: permission.id,
            name: permission.name,
            definition: permission.definition,
          },
          hasAccess: !!access, // true jika ada record di table junction
          // Sertakan detail CRUD, default ke 0 (atau null) jika tidak punya akses
          canCreate: access?.canCreate ?? 0,
          canRead: access?.canRead ?? 0,
          canUpdate: access?.canUpdate ?? 0,
          canDelete: access?.canDelete ?? 0,
          menus: menuTree,
        };
      });

      return successResponse(res, "Data berhasil diambil", result);
    } catch (error) {
      console.error(error); // Penting untuk debugging
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  togglePermission: async (req: Request, res: Response) => {
    try {
      const role_id = req.params.id as string;
      const { permissionId, hasAccess } = req.body;

      if (!permissionId) {
        return errorResponse(
          res,
          "Data tidak lengkap atau ID tidak valid",
          400,
        );
      }

      if (hasAccess) {
        await prisma.authPermToGroup.upsert({
          where: {
            permId_groupId: {
              permId: permissionId,
              groupId: role_id,
            },
          },
          update: {},
          create: {
            permId: permissionId,
            groupId: role_id,
          },
        });

        return successResponse(res, "Hak akses berhasil ditambahkan");
      } else {
        await prisma.authPermToGroup.deleteMany({
          where: {
            permId: permissionId,
            groupId: role_id,
          },
        });

        return successResponse(res, "Hak akses berhasil dicabut");
      }
    } catch (error) {
      return errorResponse(res, "Gagal memproses perubahan hak akses", 500);
    }
  },

  toggleCrud: async (req: Request, res: Response) => {
    try {
      const role_id = req.params.id as string;
      const { permissionId, field, value } = req.body;

      const validFields = ["canCreate", "canRead", "canUpdate", "canDelete"];

      if (!permissionId || !field || !validFields.includes(field)) {
        return errorResponse(
          res,
          "Data tidak lengkap atau ID tidak valid",
          400,
        );
      }

      await prisma.authPermToGroup.update({
        where: {
          permId_groupId: {
            permId: permissionId,
            groupId: role_id,
          },
        },
        data: {
          [field]: value,
        },
      });

      return successResponse(res, "Hak akses berhasil diperbarui");
    } catch (error) {
      console.log(error);
      return errorResponse(res, "Gagal memproses perubahan hak akses", 500);
    }
  },
};

export default RoleController;
