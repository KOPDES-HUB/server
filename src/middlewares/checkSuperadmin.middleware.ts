import { Request, Response, NextFunction } from "express";
import { errorResponse } from "../lib/response";

export const requireSuperadmin = (req: Request, res: any, next: NextFunction) => {
  try {
    const roles = req.user?.roles || [];
    const isSuperadmin = roles.includes("9c3c12f0-1a22-4212-bf9e-83ccde27c814");

    if (!isSuperadmin) {
      return errorResponse(res, "Akses ditolak: Hanya Superadmin yang diizinkan", 403);
    }

    return next();
  } catch (error: any) {
    return errorResponse(res, "Terjadi kesalahan otorisasi", 500, error.message);
  }
};

export const requireAdminOrSuperadmin = (req: Request, res: any, next: NextFunction) => {
  try {
    const roles = req.user?.roles || [];
    const isSuperadmin = roles.includes("9c3c12f0-1a22-4212-bf9e-83ccde27c814");
    const isAdmin = roles.includes("71504c7f-1475-4099-bf11-7b8b8b6c45f6");

    if (!isSuperadmin && !isAdmin) {
      return errorResponse(res, "Akses ditolak: Hanya Admin atau Superadmin yang diizinkan", 403);
    }

    return next();
  } catch (error: any) {
    return errorResponse(res, "Terjadi kesalahan otorisasi", 500, error.message);
  }
};
