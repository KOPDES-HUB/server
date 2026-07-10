import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  AnggotaKoperasiCreateSchema,
  AnggotaKoperasiUpdateSchema,
} from "../schemas/anggotaKoperasi.schema";

const includeRelations = {
  kopdes_hub_sch_referensi_wilayah: {
    select: {
      kode_wilayah: true,
      provinsi: true,
      kab_kota: true,
      kecamatan: true,
      desa_kelurahan: true,
    },
  },
  kopdes_hub_sch_referensi_koperasi_wilayah: {
    select: {
      koperasi_ref: true,
      kode_wilayah: true,
    },
  },
};

const AnggotaKoperasiController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_anggota_koperasi.findMany({
        orderBy: { dibuat_pada: "desc" },
        include: includeRelations,
      });

      return successResponse(res, "Data anggota koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data anggota koperasi", 500, error);
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
          { anggota_ref: { contains: search } },
          { status_keanggotaan: { contains: search, mode: "insensitive" } },
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_anggota_koperasi.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: includeRelations,
        }),
        prisma.kopdes_hub_sch_anggota_koperasi.count({ where }),
      ]);

      return successResponse(res, "Data anggota koperasi berhasil diambil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data anggota koperasi", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const anggota_ref = req.params.id as string;

      const data = await prisma.kopdes_hub_sch_anggota_koperasi.findUnique({
        where: { anggota_ref },
        include: {
          ...includeRelations,
          kopdes_hub_sch_simpanan_anggota: true,
        },
      });

      if (!data) {
        return errorResponse(res, "Anggota koperasi tidak ditemukan", 404);
      }

      return successResponse(res, "Detail anggota koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail anggota koperasi", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = AnggotaKoperasiCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        anggota_ref,
        koperasi_ref,
        nama,
        nik,
        kode_wilayah,
        jenis_kelamin,
        status_keanggotaan,
        tanggal_terdaftar,
        file_ktp,
        status_akun,
        pekerjaan,
      } = parseResult.data;

      const finalAnggotaRef = anggota_ref ?? crypto.randomUUID();

      const [existingAnggota, koperasi, wilayah] = await Promise.all([
        prisma.kopdes_hub_sch_anggota_koperasi.findUnique({
          where: { anggota_ref: finalAnggotaRef },
          select: { anggota_ref: true },
        }),
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        }),
        kode_wilayah
          ? prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
              where: { kode_wilayah },
              select: { kode_wilayah: true },
            })
          : Promise.resolve(null),
      ]);

      if (existingAnggota) {
        return errorResponse(res, "anggota_ref sudah terdaftar", 409);
      }

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      if (kode_wilayah && !wilayah) {
        return errorResponse(res, "Kode wilayah tidak ditemukan", 404);
      }

      if (nik) {
        const duplicateNik = await prisma.kopdes_hub_sch_anggota_koperasi.findFirst({
          where: { nik, koperasi_ref },
          select: { anggota_ref: true },
        });

        if (duplicateNik) {
          return errorResponse(res, "NIK sudah terdaftar di koperasi ini", 409);
        }
      }

      const now = new Date();

      const result = await prisma.kopdes_hub_sch_anggota_koperasi.create({
        data: {
          anggota_ref: finalAnggotaRef,
          koperasi_ref,
          nama,
          nik,
          kode_wilayah,
          jenis_kelamin,
          status_keanggotaan,
          tanggal_terdaftar: tanggal_terdaftar
            ? new Date(tanggal_terdaftar)
            : null,
          file_ktp,
          status_akun,
          pekerjaan,
          dibuat_pada: now,
          diperbarui_pada: now,
        },
        include: includeRelations,
      });

      return successResponse(res, "Anggota koperasi berhasil dibuat", result, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const anggota_ref = req.params.id as string;

      const parseResult = AnggotaKoperasiUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing = await prisma.kopdes_hub_sch_anggota_koperasi.findUnique({
        where: { anggota_ref },
        select: { anggota_ref: true, koperasi_ref: true, nik: true },
      });

      if (!existing) {
        return errorResponse(res, "Anggota koperasi tidak ditemukan", 404);
      }

      const {
        koperasi_ref,
        nama,
        nik,
        kode_wilayah,
        jenis_kelamin,
        status_keanggotaan,
        tanggal_terdaftar,
        file_ktp,
        status_akun,
        pekerjaan,
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

      if (kode_wilayah) {
        const wilayah = await prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
          where: { kode_wilayah },
          select: { kode_wilayah: true },
        });

        if (!wilayah) {
          return errorResponse(res, "Kode wilayah tidak ditemukan", 404);
        }
      }

      if (nik && nik !== existing.nik) {
        const duplicateNik = await prisma.kopdes_hub_sch_anggota_koperasi.findFirst({
          where: {
            nik,
            koperasi_ref: koperasi_ref ?? existing.koperasi_ref,
            NOT: { anggota_ref },
          },
          select: { anggota_ref: true },
        });

        if (duplicateNik) {
          return errorResponse(res, "NIK sudah terdaftar di koperasi ini", 409);
        }
      }

      const result = await prisma.kopdes_hub_sch_anggota_koperasi.update({
        where: { anggota_ref },
        data: {
          ...(koperasi_ref !== undefined && { koperasi_ref }),
          ...(nama !== undefined && { nama }),
          ...(nik !== undefined && { nik }),
          ...(kode_wilayah !== undefined && { kode_wilayah }),
          ...(jenis_kelamin !== undefined && { jenis_kelamin }),
          ...(status_keanggotaan !== undefined && { status_keanggotaan }),
          ...(tanggal_terdaftar !== undefined && {
            tanggal_terdaftar: tanggal_terdaftar
              ? new Date(tanggal_terdaftar)
              : null,
          }),
          ...(file_ktp !== undefined && { file_ktp }),
          ...(status_akun !== undefined && { status_akun }),
          ...(pekerjaan !== undefined && { pekerjaan }),
          diperbarui_pada: new Date(),
        },
        include: includeRelations,
      });

      return successResponse(res, "Anggota koperasi berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const anggota_ref = req.params.id as string;

      const existing = await prisma.kopdes_hub_sch_anggota_koperasi.findUnique({
        where: { anggota_ref },
        select: { anggota_ref: true, nama: true },
      });

      if (!existing) {
        return errorResponse(res, "Anggota koperasi tidak ditemukan", 404);
      }

      const simpananCount = await prisma.kopdes_hub_sch_simpanan_anggota.count({
        where: { anggota_ref },
      });

      if (simpananCount > 0) {
        return errorResponse(
          res,
          "Anggota tidak dapat dihapus karena masih memiliki data simpanan",
          409,
        );
      }

      await prisma.kopdes_hub_sch_anggota_koperasi.delete({
        where: { anggota_ref },
      });

      return successResponse(
        res,
        `Anggota ${existing.nama ?? existing.anggota_ref} berhasil dihapus`,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default AnggotaKoperasiController;