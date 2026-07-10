import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  KaryawanKoperasiCreateSchema,
  KaryawanKoperasiUpdateSchema,
} from "../schemas/karyawanKoperasi.schema";

const includeRelations = {
  kopdes_hub_sch_referensi_koperasi_wilayah: {
    select: {
      koperasi_ref: true,
      kode_wilayah: true,
    },
  },
};

const KaryawanKoperasiController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_karyawan_koperasi.findMany({
        orderBy: { dibuat_pada: "desc" },
        include: includeRelations,
      });

      return successResponse(res, "Data karyawan koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data karyawan koperasi", 500, error);
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const koperasi_ref = (req.query.koperasi_ref as string) || "";
      const sortBy = (req.query.sortBy as string) || "dibuat_pada";
      const sortOrder =
        (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

      const skip = (page - 1) * limit;
      const where: any = {};

      if (koperasi_ref) {
        where.koperasi_ref = koperasi_ref;
      }

      if (search) {
        where.OR = [
          { nama: { contains: search, mode: "insensitive" } },
          { nik: { contains: search } },
          { karyawan_ref: { contains: search } },
          { jabatan: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
          { nomor_hp_karyawan: { contains: search } },
          { status_karyawan: { contains: search, mode: "insensitive" } },
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_karyawan_koperasi.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: includeRelations,
        }),
        prisma.kopdes_hub_sch_karyawan_koperasi.count({ where }),
      ]);

      return successResponse(res, "Data karyawan koperasi berhasil diambil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data karyawan koperasi", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const karyawan_ref = req.params.id as string;

      const data = await prisma.kopdes_hub_sch_karyawan_koperasi.findUnique({
        where: { karyawan_ref },
        include: includeRelations,
      });

      if (!data) {
        return errorResponse(res, "Karyawan koperasi tidak ditemukan", 404);
      }

      return successResponse(res, "Detail karyawan koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail karyawan koperasi", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = KaryawanKoperasiCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        karyawan_ref,
        koperasi_ref,
        nama,
        jabatan,
        nomor_hp_karyawan,
        jenis_kelamin,
        nik,
        email,
        status_karyawan,
      } = parseResult.data;

      const finalKaryawanRef = karyawan_ref ?? crypto.randomUUID();

      const [existingKaryawan, koperasi] = await Promise.all([
        prisma.kopdes_hub_sch_karyawan_koperasi.findUnique({
          where: { karyawan_ref: finalKaryawanRef },
          select: { karyawan_ref: true },
        }),
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        }),
      ]);

      if (existingKaryawan) {
        return errorResponse(res, "karyawan_ref sudah terdaftar", 409);
      }

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      if (nik) {
        const duplicateNik =
          await prisma.kopdes_hub_sch_karyawan_koperasi.findFirst({
            where: { nik, koperasi_ref },
            select: { karyawan_ref: true },
          });

        if (duplicateNik) {
          return errorResponse(res, "NIK sudah terdaftar di koperasi ini", 409);
        }
      }

      if (email) {
        const duplicateEmail =
          await prisma.kopdes_hub_sch_karyawan_koperasi.findFirst({
            where: { email, koperasi_ref },
            select: { karyawan_ref: true },
          });

        if (duplicateEmail) {
          return errorResponse(res, "Email sudah terdaftar di koperasi ini", 409);
        }
      }

      const now = new Date();

      const result = await prisma.kopdes_hub_sch_karyawan_koperasi.create({
        data: {
          karyawan_ref: finalKaryawanRef,
          koperasi_ref,
          nama,
          jabatan,
          nomor_hp_karyawan,
          jenis_kelamin,
          nik,
          email,
          status_karyawan,
          dibuat_pada: now,
          diperbarui_pada: now,
        },
        include: includeRelations,
      });

      return successResponse(res, "Karyawan koperasi berhasil dibuat", result, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const karyawan_ref = req.params.id as string;

      const parseResult = KaryawanKoperasiUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing = await prisma.kopdes_hub_sch_karyawan_koperasi.findUnique({
        where: { karyawan_ref },
        select: {
          karyawan_ref: true,
          koperasi_ref: true,
          nik: true,
          email: true,
        },
      });

      if (!existing) {
        return errorResponse(res, "Karyawan koperasi tidak ditemukan", 404);
      }

      const {
        koperasi_ref,
        nama,
        jabatan,
        nomor_hp_karyawan,
        jenis_kelamin,
        nik,
        email,
        status_karyawan,
      } = parseResult.data;

      if (koperasi_ref) {
        const koperasi =
          await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
            where: { koperasi_ref },
            select: { koperasi_ref: true },
          });

        if (!koperasi) {
          return errorResponse(res, "Koperasi tidak ditemukan", 404);
        }
      }

      if (nik && nik !== existing.nik) {
        const duplicateNik =
          await prisma.kopdes_hub_sch_karyawan_koperasi.findFirst({
            where: {
              nik,
              koperasi_ref: koperasi_ref ?? existing.koperasi_ref,
              NOT: { karyawan_ref },
            },
            select: { karyawan_ref: true },
          });

        if (duplicateNik) {
          return errorResponse(res, "NIK sudah terdaftar di koperasi ini", 409);
        }
      }

      if (email && email !== existing.email) {
        const duplicateEmail =
          await prisma.kopdes_hub_sch_karyawan_koperasi.findFirst({
            where: {
              email,
              koperasi_ref: koperasi_ref ?? existing.koperasi_ref,
              NOT: { karyawan_ref },
            },
            select: { karyawan_ref: true },
          });

        if (duplicateEmail) {
          return errorResponse(res, "Email sudah terdaftar di koperasi ini", 409);
        }
      }

      const result = await prisma.kopdes_hub_sch_karyawan_koperasi.update({
        where: { karyawan_ref },
        data: {
          ...(koperasi_ref !== undefined && { koperasi_ref }),
          ...(nama !== undefined && { nama }),
          ...(jabatan !== undefined && { jabatan }),
          ...(nomor_hp_karyawan !== undefined && { nomor_hp_karyawan }),
          ...(jenis_kelamin !== undefined && { jenis_kelamin }),
          ...(nik !== undefined && { nik }),
          ...(email !== undefined && { email }),
          ...(status_karyawan !== undefined && { status_karyawan }),
          diperbarui_pada: new Date(),
        },
        include: includeRelations,
      });

      return successResponse(res, "Karyawan koperasi berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const karyawan_ref = req.params.id as string;

      const existing = await prisma.kopdes_hub_sch_karyawan_koperasi.findUnique({
        where: { karyawan_ref },
        select: { karyawan_ref: true, nama: true },
      });

      if (!existing) {
        return errorResponse(res, "Karyawan koperasi tidak ditemukan", 404);
      }

      await prisma.kopdes_hub_sch_karyawan_koperasi.delete({
        where: { karyawan_ref },
      });

      return successResponse(
        res,
        `Karyawan ${existing.nama ?? existing.karyawan_ref} berhasil dihapus`,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default KaryawanKoperasiController;
