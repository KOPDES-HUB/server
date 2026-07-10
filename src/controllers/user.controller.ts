import { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import { UserCreateSchema, UserEditSchema } from "../schemas/user.schema";

const userAnggotaInclude = {
  anggota: {
    select: {
      anggota_ref: true,
      nama: true,
      nik: true,
      koperasi_ref: true,
      status_keanggotaan: true,
    },
  },
};

const validateUserAnggotaFields = async (
  noWA?: string | null,
  refAnggota?: string | null,
  excludeUserId?: string,
) => {
  if (refAnggota) {
    const anggota = await prisma.kopdes_hub_sch_anggota_koperasi.findUnique({
      where: { anggota_ref: refAnggota },
      select: { anggota_ref: true },
    });

    if (!anggota) {
      return { error: "Anggota koperasi tidak ditemukan", status: 404 };
    }

    const linkedUser = await prisma.authUser.findFirst({
      where: {
        refAnggota,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (linkedUser) {
      return {
        error: "Anggota sudah terhubung ke akun lain",
        status: 409,
      };
    }
  }

  if (noWA) {
    const duplicateNoWA = await prisma.authUser.findFirst({
      where: {
        noWA,
        ...(excludeUserId ? { NOT: { id: excludeUserId } } : {}),
      },
      select: { id: true },
    });

    if (duplicateNoWA) {
      return { error: "Nomor WA sudah terdaftar", status: 409 };
    }
  }

  return null;
};

const UserController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const users = await prisma.authUser.findMany({
        take: 10,
        orderBy: {
          createdAt: "asc",
        },
      });

      return successResponse(res, "Data berhasil diambil", users);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data", 500, error);
    }
  },

  getPegawai: async (req: Request, res: Response) => {
    try {
      const users = await prisma.authUser.findMany({
        where: {
          authUserToGroup: {
            some: {
              groupId: {
                in: [
                  "7f5dd362-ce40-4a22-ac9c-5cb1d9fd219d", // Pegawai
                  "71504c7f-1475-4099-bf11-7b8b8b6c45f6", // Admin
                  "9c3c12f0-1a22-4212-bf9e-83ccde27c814", // Superadmin
                ],
              } as any,
            },
          },
        },
        orderBy: {
          username: "asc",
        },
      });

      return successResponse(res, "Data pegawai berhasil diambil", users);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data pegawai", 500, error);
    }
  },

  getAdmin: async (req: Request, res: Response) => {
    try {
      const users = await prisma.authUser.findMany({
        where: {
          authUserToGroup: {
            some: {
              groupId: "71504c7f-1475-4099-bf11-7b8b8b6c45f6",
            },
          },
        },
        orderBy: {
          username: "asc",
        },
      });

      return successResponse(res, "Data admin berhasil diambil", users);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data admin", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const user = await prisma.authUser.findFirst({
        where: { id },
        include: {
          authUserToGroup: {
            select: {
              groupId: true,
            },
          },
          ...userAnggotaInclude,
        },
      });

      if (!user) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      const result = {
        ...user,
        roles: user.authUserToGroup.map((ug) => ug.groupId),
        auth_user_to_group: undefined,
      };

      return successResponse(res, "Detail user berhasil diambil", result);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data user", 500, error);
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
              { username: { contains: search } },
              { email: { contains: search } },
            ],
          }
        : {};

      const [users, total] = await Promise.all([
        prisma.authUser.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            [sortBy]: sortOrder,
          },
          include: userAnggotaInclude,
        }),
        prisma.authUser.count({ where }),
      ]);

      return successResponse(res, "Data  berhasil diambil", {
        result: users,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data ", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = UserCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }
  
      const { username, email, password, roles, noWA, refAnggota } =
        parseResult.data;
  
      const existingUser = await prisma.authUser.findFirst({
        where: { email },
        select: { id: true },
      });
  
      if (existingUser) {
        return errorResponse(res, "Email sudah terdaftar", 409);
      }
  
      const anggotaValidation = await validateUserAnggotaFields(
        noWA ?? null,
        refAnggota ?? null,
      );
  
      if (anggotaValidation) {
        return errorResponse(
          res,
          anggotaValidation.error,
          anggotaValidation.status,
        );
      }
  
      const hashedPassword = await argon2.hash(password);
  
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.authUser.create({
          data: {
            username,
            email,
            password: hashedPassword,
            noWA: noWA ?? null,
            refAnggota: refAnggota ?? null,
          },
          include: userAnggotaInclude,
        });
  
        if (roles && roles.length > 0) {
          await tx.authUserToGroup.createMany({
            data: roles.map((groupId) => ({ userId: user.id, groupId })),
          });
        }
  
        return user;
      });
  
      return successResponse(res, "User berhasil dibuat", result, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  edit: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;
  
      const parseResult = UserEditSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }
  
      const { username, email, password, roles, noWA, refAnggota } =
        parseResult.data;
  
      const existingUser = await prisma.authUser.findFirst({
        where: { id },
        select: { id: true },
      });
  
      if (!existingUser) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }
  
      const duplicateUser = await prisma.authUser.findFirst({
        where: { email, NOT: { id } },
        select: { id: true },
      });
  
      if (duplicateUser) {
        return errorResponse(res, "Email sudah digunakan", 409);
      }
  
      const anggotaValidation = await validateUserAnggotaFields(
        noWA,
        refAnggota,
        id,
      );
  
      if (anggotaValidation) {
        return errorResponse(
          res,
          anggotaValidation.error,
          anggotaValidation.status,
        );
      }
  
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.authUser.update({
          where: { id },
          data: {
            username,
            email,
            ...(password ? { password: await argon2.hash(password) } : {}),
            ...(noWA !== undefined && { noWA }),
            ...(refAnggota !== undefined && { refAnggota }),
          },
          include: userAnggotaInclude,
        });
  
        if (roles) {
          await tx.authUserToGroup.deleteMany({ where: { userId: id } });
          await tx.authUserToGroup.createMany({
            data: roles.map((groupId) => ({ userId: id, groupId })),
          });
        }
  
        return user;
      });
  
      return successResponse(res, "User berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  getDirectory: async (req: Request, res: Response) => {
    try {
      const users = await prisma.authUser.findMany({
        where: {
          authUserToGroup: {
            some: {
              groupId: {
                in: [
                  "7f5dd362-ce40-4a22-ac9c-5cb1d9fd219d", // Pegawai
                  "71504c7f-1475-4099-bf11-7b8b8b6c45f6", // Admin
                  "9c3c12f0-1a22-4212-bf9e-83ccde27c814", // Superadmin
                ],
              },
            },
          },
        },
        include: {
          authUserToGroup: {
            include: {
              group: {
                select: {
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          username: "asc",
        },
      });

      const formatted = users.map((u) => ({
        id: u.id,
        username: u.username,
        email: u.email,
        banned: u.banned,
        avatar: u.avatar,
        lastLogin: u.lastLogin,
        lastActivity: u.lastActivity,
        roles: u.authUserToGroup.map((ug) => ug.group.name),
      }));

      return successResponse(
        res,
        "Daftar pengguna berhasil diambil",
        formatted,
      );
    } catch (error) {
      return errorResponse(res, "Gagal mengambil daftar pengguna", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const id = req.params.id as string;

      const user = await prisma.authUser.findFirst({
        where: { id },
        select: { id: true, username: true },
      });

      if (!user) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      await prisma.authUser.delete({
        where: { id },
      });

      return successResponse(res, `User ${user.username} berhasil dihapus`);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },
};

export default UserController;
