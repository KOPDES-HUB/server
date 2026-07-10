import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  SimpananAnggotaCreateSchema,
  SimpananAnggotaUpdateSchema,
} from "../schemas/simpananAnggota.schema";

const includeRelations = {
  kopdes_hub_sch_anggota_koperasi: {
    select: {
      anggota_ref: true,
      nama: true,
      nik: true,
      koperasi_ref: true,
      status_keanggotaan: true,
    },
  },
  kopdes_hub_sch_referensi_koperasi_wilayah: {
    select: {
      koperasi_ref: true,
      kode_wilayah: true,
    },
  },
};

const SimpananAnggotaController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_simpanan_anggota.findMany({
        orderBy: { dibuat_pada: "desc" },
        include: includeRelations,
      });

      return successResponse(res, "Data simpanan anggota berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data simpanan anggota", 500, error);
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const koperasi_ref = (req.query.koperasi_ref as string) || "";
      const anggota_ref = (req.query.anggota_ref as string) || "";
      const sortBy = (req.query.sortBy as string) || "dibuat_pada";
      const sortOrder =
        (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

      const skip = (page - 1) * limit;
      const where: any = {};

      if (koperasi_ref) {
        where.koperasi_ref = koperasi_ref;
      }

      if (anggota_ref) {
        where.anggota_ref = anggota_ref;
      }

      if (search) {
        where.OR = [
          { simpanan_ref: { contains: search } },
          { periode_pembayaran: { contains: search, mode: "insensitive" } },
          { status: { contains: search, mode: "insensitive" } },
          {
            kopdes_hub_sch_anggota_koperasi: {
              nama: { contains: search, mode: "insensitive" },
            },
          },
          {
            kopdes_hub_sch_anggota_koperasi: {
              nik: { contains: search },
            },
          },
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_simpanan_anggota.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: includeRelations,
        }),
        prisma.kopdes_hub_sch_simpanan_anggota.count({ where }),
      ]);

      return successResponse(res, "Data simpanan anggota berhasil diambil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data simpanan anggota", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const simpanan_ref = req.params.id as string;

      const data = await prisma.kopdes_hub_sch_simpanan_anggota.findUnique({
        where: { simpanan_ref },
        include: includeRelations,
      });

      if (!data) {
        return errorResponse(res, "Simpanan anggota tidak ditemukan", 404);
      }

      return successResponse(res, "Detail simpanan anggota berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail simpanan anggota", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = SimpananAnggotaCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        simpanan_ref,
        koperasi_ref,
        anggota_ref,
        periode_pembayaran,
        jumlah_simpanan,
        status,
        dibayar_pada,
      } = parseResult.data;
      const finalSimpananRef = simpanan_ref ?? crypto.randomUUID();

      const [existingSimpanan, koperasi, anggota] = await Promise.all([
        prisma.kopdes_hub_sch_simpanan_anggota.findUnique({
          where: { simpanan_ref: finalSimpananRef },
          select: { simpanan_ref: true },
        }),
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        }),
        prisma.kopdes_hub_sch_anggota_koperasi.findUnique({
          where: { anggota_ref },
          select: { anggota_ref: true, koperasi_ref: true },
        }),
      ]);

      if (existingSimpanan) {
        return errorResponse(res, "simpanan_ref sudah terdaftar", 409);
      }

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      if (!anggota) {
        return errorResponse(res, "Anggota koperasi tidak ditemukan", 404);
      }

      if (anggota.koperasi_ref !== koperasi_ref) {
        return errorResponse(
          res,
          "Anggota tidak terdaftar pada koperasi yang dipilih",
          400,
        );
      }

      const now = new Date();
      const result = await prisma.kopdes_hub_sch_simpanan_anggota.create({
        data: {
          simpanan_ref: finalSimpananRef,
          koperasi_ref,
          anggota_ref,
          periode_pembayaran,
          jumlah_simpanan,
          status,
          dibuat_pada: now,
          dibayar_pada: dibayar_pada ? new Date(dibayar_pada) : null,
        },
        include: includeRelations,
      });

      return successResponse(res, "Simpanan anggota berhasil dibuat", result, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const simpanan_ref = req.params.id as string;
      const parseResult = SimpananAnggotaUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing = await prisma.kopdes_hub_sch_simpanan_anggota.findUnique({
        where: { simpanan_ref },
        select: {
          simpanan_ref: true,
          koperasi_ref: true,
          anggota_ref: true,
        },
      });

      if (!existing) {
        return errorResponse(res, "Simpanan anggota tidak ditemukan", 404);
      }

      const {
        koperasi_ref,
        anggota_ref,
        periode_pembayaran,
        jumlah_simpanan,
        status,
        dibayar_pada,
      } = parseResult.data;

      const finalKoperasiRef = koperasi_ref ?? existing.koperasi_ref;
      const finalAnggotaRef = anggota_ref ?? existing.anggota_ref;

      const [koperasi, anggota] = await Promise.all([
        koperasi_ref
          ? prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
              where: { koperasi_ref: finalKoperasiRef },
              select: { koperasi_ref: true },
            })
          : Promise.resolve({ koperasi_ref: finalKoperasiRef }),
        anggota_ref || koperasi_ref
          ? prisma.kopdes_hub_sch_anggota_koperasi.findUnique({
              where: { anggota_ref: finalAnggotaRef },
              select: { anggota_ref: true, koperasi_ref: true },
            })
          : Promise.resolve(null),
      ]);

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      if ((anggota_ref || koperasi_ref) && !anggota) {
        return errorResponse(res, "Anggota koperasi tidak ditemukan", 404);
      }

      if (anggota && anggota.koperasi_ref !== finalKoperasiRef) {
        return errorResponse(
          res,
          "Anggota tidak terdaftar pada koperasi yang dipilih",
          400,
        );
      }

      const result = await prisma.kopdes_hub_sch_simpanan_anggota.update({
        where: { simpanan_ref },
        data: {
          ...(koperasi_ref !== undefined && { koperasi_ref }),
          ...(anggota_ref !== undefined && { anggota_ref }),
          ...(periode_pembayaran !== undefined && { periode_pembayaran }),
          ...(jumlah_simpanan !== undefined && { jumlah_simpanan }),
          ...(status !== undefined && { status }),
          ...(dibayar_pada !== undefined && {
            dibayar_pada: dibayar_pada ? new Date(dibayar_pada) : null,
          }),
        },
        include: includeRelations,
      });

      return successResponse(res, "Simpanan anggota berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const simpanan_ref = req.params.id as string;

      const existing = await prisma.kopdes_hub_sch_simpanan_anggota.findUnique({
        where: { simpanan_ref },
        select: { simpanan_ref: true },
      });

      if (!existing) {
        return errorResponse(res, "Simpanan anggota tidak ditemukan", 404);
      }

      await prisma.kopdes_hub_sch_simpanan_anggota.delete({
        where: { simpanan_ref },
      });

      return successResponse(res, "Simpanan anggota berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default SimpananAnggotaController;
