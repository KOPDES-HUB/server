import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import argon2 from "argon2";
import {
  ChangePasswordSchema,
  LoginSchema,
  UpdateProfileSchema,
} from "../schemas/auth.schema";
import { deleteAvatarFile } from "../middlewares/upload.middleware";
import { Request, Response } from "express";
import { generateAccessToken, generateRefreshToken } from "../lib/token";
import { UserPayload } from "../types/user";
import jwt from "jsonwebtoken";

import crypto from "crypto";

const AuthController = {
  login: async (req: Request, res: Response) => {
    try {
      const parsed = LoginSchema.safeParse(req.body);
      if (!parsed.success) {
        return errorResponse(res, "Input tidak valid", 400, parsed.error);
      }

      const { email, nik, password } = parsed.data;
      const identifier = email || nik;

      if (!identifier) {
        return errorResponse(res, "Email atau NIK wajib diisi", 400);
      }

      // Deteksi apakah identifier itu email atau NIK
      const isEmail = identifier.includes("@");

      // const user = await prisma.authUser.findFirst({
      //   where: isEmail ? { email: identifier } : { nik: identifier },
      //   select: {
      //     id: true,
      //     email: true,
      //     nik: true,
      //     password: true,
      //     banned: true,
      //     statusRegistrasi: true,
      //     isAdmin: true,
      //     koperasiRef: true,
      //   },
      // });

      const user = await prisma.authUser.findFirst({
        where: isEmail ? { email: identifier } : { nik: identifier },
        include: {
          anggota: {
            select: {
              koperasi_ref: true,
            },
          },
        },
      });

      if (user?.statusRegistrasi == "DIAJUKAN") {
        return errorResponse(
          res,
          "Registrasi Anda masih menunggu persetujuan admin",
          403,
        );
      }

      if (user?.statusRegistrasi == "DITOLAK") {
        return errorResponse(res, "Registrasi Anda ditolak", 403);
      }

      if (user?.statusRegistrasi == "DITANGGUHKAN") {
        return errorResponse(res, "Akun Anda sedang dinonaktifkan", 403);
      }

      if (!user) return errorResponse(res, "Username atau password salah", 401);

      if (user.banned)
        return errorResponse(res, "Akun Anda telah ditangguhkan", 403);

      if (!user.password)
        return errorResponse(res, "Username atau password salah", 401);

      const isValid = await argon2.verify(user.password, password);
      if (!isValid)
        return errorResponse(res, "Username atau password salah", 401);

      // const userWithGroups = await prisma.authUser.findUnique({
      //   where: { id: user.id },
      //   include: {
      //     authUserToGroup: {
      //       include: {
      //         group: {
      //           include: {
      //             authPermToGroup: {
      //               include: {
      //                 permission: {
      //                   include: { menus: true },
      //                 },
      //               },
      //             },
      //           },
      //         },
      //       },
      //     },
      //   },
      // });

      const userWithGroups = await prisma.authUser.findUnique({
        where: {
          id: user.id,
        },
        include: {
          anggota: {
            select: {
              anggota_ref: true,
              koperasi_ref: true,
              nomor_kta: true,
              status_keanggotaan: true,
            },
          },
          authUserToGroup: {
            include: {
              group: {
                include: {
                  authPermToGroup: {
                    include: {
                      permission: {
                        include: {
                          menus: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!userWithGroups)
        return errorResponse(res, "User tidak ditemukan", 404);

      const menuMap = new Map<string, any>();
      userWithGroups.authUserToGroup.forEach((ug) => {
        ug.group.authPermToGroup.forEach((apg) => {
          apg.permission.menus.forEach((menu) => {
            menuMap.set(menu.id, {
              id: menu.id,
              name: menu.name,
              url: menu.url,
              icon: menu.icon,
              sequence: menu.sequence,
              parentId: menu.parentId,
            });
          });
        });
      });

      const userMenus = Array.from(menuMap.values()).sort(
        (a, b) => a.sequence - b.sequence,
      );

      const userRoleIds = userWithGroups.authUserToGroup.map(
        (ug) => ug.groupId,
      );

      await createUserSession(userWithGroups, req, res);

      return successResponse(res, "Login berhasil", {
        user: {
          id: userWithGroups.id,
          username: userWithGroups.username,
          email: userWithGroups.email,
          roles: userRoleIds,
          menus: userMenus,
          isAdmin: userWithGroups.isAdmin,
          statusRegistrasi: userWithGroups.statusRegistrasi,
          
          koperasiRef: userWithGroups.koperasiRef ?? null,
          anggotaRef: userWithGroups.anggota?.anggota_ref ?? null,
          nomorKta: userWithGroups.anggota?.nomor_kta ?? null,
          statusKeanggotaan: userWithGroups.anggota?.status_keanggotaan ?? null,
        },
      });
    } catch (error) {
      console.error("LOGIN ERROR:", error);
      return errorResponse(res, "Terjadi kesalahan pada server", 500);
    }
  },

  refreshToken: async (req: Request, res: Response) => {
    try {
      const refreshToken = req.cookies?.refreshToken;
      if (!refreshToken) {
        return errorResponse(res, "Refresh token not found", 401);
      }
      let decoded: UserPayload;
      try {
        decoded = jwt.verify(
          refreshToken,
          process.env.JWT_REFRESH_SECRET as string,
        ) as UserPayload;
      } catch (verifyErr) {
        return errorResponse(res, "Invalid refresh token", 401, verifyErr);
      }
      const storedToken = await prisma.authUserToken.findFirst({
        where: {
          userId: decoded.id,
          refreshToken,
        },
      });
      // --- LOGIKA BARU: DETEKSI PENCURIAN & ROTASI ---
      if (!storedToken) {
        // DETEKSI PENCURIAN: Token valid secara kriptografi tapi tidak ada di DB
        await prisma.authUserToken.deleteMany({
          where: { userId: decoded.id },
        });
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return errorResponse(
          res,
          "Deteksi penggunaan token tidak valid. Anda telah di-logout otomatis.",
          401,
        );
      }
      if (storedToken.expiresAt < new Date()) {
        await prisma.authUserToken.delete({
          where: { id: storedToken.id },
        });
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return errorResponse(res, "Refresh token expired", 401);
      }
      const payload: UserPayload = {
        id: decoded.id,
        username: decoded.username,
        roles: decoded.roles,
      };
      const newAccessToken = generateAccessToken(payload);
      const newRefreshToken = generateRefreshToken(payload);
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      // Rotasi token di database
      await prisma.authUserToken.update({
        where: { id: storedToken.id },
        data: {
          refreshToken: newRefreshToken,
          expiresAt,
          deviceInfo: req.headers["user-agent"] || "Unknown Device",
        },
      });
      res.cookie("accessToken", newAccessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 15 * 60 * 1000,
      });
      res.cookie("refreshToken", newRefreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      return successResponse(res, "Token refreshed");
    } catch (err) {
      return errorResponse(res, "Invalid refresh token", 401, err);
    }
  },

  getMe: async (req: Request, res: Response) => {
    try {
      if (!req.user?.id) {
        return errorResponse(res, "Unauthorized", 401);
      }

      const user = await prisma.authUser.findUnique({
        where: { id: req.user.id },
        include: {
          authUserToGroup: {
            include: {
              group: {
                include: {
                  authPermToGroup: {
                    include: {
                      permission: {
                        include: {
                          menus: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!user) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      // roles
      const userRoleIds = user.authUserToGroup.map((ug) => ug.groupId);

      // menus (samakan dengan login)
      const menuMap = new Map<string, any>();

      user.authUserToGroup.forEach((ug) => {
        ug.group.authPermToGroup.forEach((apg) => {
          apg.permission.menus.forEach((menu) => {
            menuMap.set(menu.id, {
              id: menu.id,
              name: menu.name,
              url: menu.url,
              icon: menu.icon,
              sequence: menu.sequence,
              parentId: menu.parentId,
            });
          });
        });
      });

      const userMenus = Array.from(menuMap.values()).sort(
        (a, b) => a.sequence - b.sequence,
      );

      const userData = {
        id: user.id,
        username: user.username,
        email: user.email,
        roles: userRoleIds,
        menus: userMenus,
        avatar: user.avatar,
      };

      return successResponse(res, "Data user berhasil diambil", userData);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data user", 500);
    }
  },

  changePassword: async (req: Request, res: Response) => {
    try {
      const parseResult = ChangePasswordSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { currentPassword, password } = parseResult.data;

      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, "Unauthorized", 401);
      }

      const existingUser = await prisma.authUser.findUnique({
        where: { id: userId },
        select: { id: true, password: true },
      });

      if (!existingUser) {
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      const isCurrentPasswordValid = await argon2.verify(
        existingUser.password ?? "",
        currentPassword,
      );
      if (!isCurrentPasswordValid) {
        return errorResponse(res, "Password saat ini tidak valid", 400);
      }

      const isSamePassword = await argon2.verify(
        existingUser.password ?? "",
        password,
      );
      if (isSamePassword) {
        return errorResponse(
          res,
          "Password baru tidak boleh sama dengan password lama",
          400,
        );
      }

      const hashedPassword = await argon2.hash(password);

      await prisma.authUser.update({
        where: { id: userId },
        data: { password: hashedPassword },
      });

      return successResponse(res, "Password berhasil diubah");
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500);
    }
  },

  updateProfile: async (req: Request, res: Response) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return errorResponse(res, "Unauthorized", 401);
      }

      const parseResult = UpdateProfileSchema.safeParse(req.body);
      if (!parseResult.success) {
        if (req.file) {
          deleteAvatarFile(req.file.path);
        }
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { username, email, removeAvatar } = parseResult.data;

      const user = await prisma.authUser.findUnique({
        where: { id: userId },
      });

      if (!user) {
        if (req.file) {
          deleteAvatarFile(req.file.path);
        }
        return errorResponse(res, "User tidak ditemukan", 404);
      }

      const duplicateUser = await prisma.authUser.findFirst({
        where: {
          email,
          NOT: { id: userId },
        },
      });

      if (duplicateUser) {
        if (req.file) {
          deleteAvatarFile(req.file.path);
        }
        return errorResponse(res, "Email sudah digunakan oleh akun lain", 409);
      }

      let avatarPath = user.avatar;

      if (removeAvatar === "true") {
        if (user.avatar) {
          deleteAvatarFile(user.avatar);
        }
        avatarPath = null;
      } else if (req.file) {
        if (user.avatar) {
          deleteAvatarFile(user.avatar);
        }
        avatarPath = req.file.path.replace(/\\/g, "/");
      }

      const updatedUser = await prisma.authUser.update({
        where: { id: userId },
        data: {
          username,
          email,
          avatar: avatarPath,
        },
      });

      return successResponse(res, "Profil berhasil diupdate", {
        id: updatedUser.id,
        username: updatedUser.username,
        email: updatedUser.email,
        avatar: updatedUser.avatar,
      });
    } catch (error) {
      if (req.file) {
        deleteAvatarFile(req.file.path);
      }
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

const createUserSession = async (user: any, req: Request, res: Response) => {
  const userRoleIds = user.authUserToGroup.map((ug: any) => ug.groupId);

  const payload: UserPayload = {
    id: user.id,
    username: user.username,
    roles: userRoleIds,
  };

  const accessToken = generateAccessToken(payload);
  const refreshToken = generateRefreshToken(payload);

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.$transaction([
    prisma.authUserToken.deleteMany({
      where: { userId: user.id },
    }),
    prisma.authUserToken.create({
      data: {
        userId: user.id,
        refreshToken,
        deviceInfo: req.headers["user-agent"] || "Unknown Device",
        expiresAt,
      },
    }),
    prisma.authUser.update({
      where: { id: user.id },
      data: {
        lastLogin: new Date(),
        lastActivity: new Date(),
      },
    }),
  ]);

  res.cookie("accessToken", accessToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  return { accessToken, refreshToken };
};

export default AuthController;
