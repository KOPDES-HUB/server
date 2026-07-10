import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  ReferensiWilayahCreateSchema,
  ReferensiWilayahUpdateSchema,
} from "../schemas/referensiWilayah.schema";

const ReferensiWilayahController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_referensi_wilayah.findMany({
        orderBy: [{ provinsi: "asc" }, { kab_kota: "asc" }],
      });

      return successResponse(res, "Data referensi wilayah berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data referensi wilayah", 500, error);
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const sortBy = (req.query.sortBy as string) || "provinsi";
      const sortOrder =
        (req.query.sortOrder as string) === "desc" ? "desc" : "asc";

      const skip = (page - 1) * limit;
      const where: any = {};

      if (search) {
        where.OR = [
          { kode_wilayah: { contains: search } },
          { provinsi: { contains: search, mode: "insensitive" } },
          { kab_kota: { contains: search, mode: "insensitive" } },
          { kecamatan: { contains: search, mode: "insensitive" } },
          { desa_kelurahan: { contains: search, mode: "insensitive" } },
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_referensi_wilayah.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.kopdes_hub_sch_referensi_wilayah.count({ where }),
      ]);

      return successResponse(res, "Data referensi wilayah berhasil diambil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data referensi wilayah", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const kode_wilayah = req.params.id as string;

      const data = await prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
        where: { kode_wilayah },
        include: {
          kopdes_hub_sch_anggota_koperasi: true,
        },
      });

      if (!data) {
        return errorResponse(res, "Referensi wilayah tidak ditemukan", 404);
      }

      return successResponse(res, "Detail referensi wilayah berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail referensi wilayah", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = ReferensiWilayahCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        kode_wilayah,
        provinsi,
        kab_kota,
        kecamatan,
        desa_kelurahan,
      } = parseResult.data;

      const existing = await prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
        where: { kode_wilayah },
        select: { kode_wilayah: true },
      });

      if (existing) {
        return errorResponse(res, "kode_wilayah sudah terdaftar", 409);
      }

      const now = new Date();
      const result = await prisma.kopdes_hub_sch_referensi_wilayah.create({
        data: {
          kode_wilayah,
          provinsi,
          kab_kota,
          kecamatan,
          desa_kelurahan,
          dibuat_pada: now,
          diperbarui_pada: now,
        },
      });

      return successResponse(res, "Referensi wilayah berhasil dibuat", result, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const kode_wilayah = req.params.id as string;
      const parseResult = ReferensiWilayahUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing = await prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
        where: { kode_wilayah },
        select: { kode_wilayah: true },
      });

      if (!existing) {
        return errorResponse(res, "Referensi wilayah tidak ditemukan", 404);
      }

      const {
        kode_wilayah: nextKodeWilayah,
        provinsi,
        kab_kota,
        kecamatan,
        desa_kelurahan,
      } = parseResult.data;

      if (nextKodeWilayah && nextKodeWilayah !== kode_wilayah) {
        const duplicate = await prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
          where: { kode_wilayah: nextKodeWilayah },
          select: { kode_wilayah: true },
        });

        if (duplicate) {
          return errorResponse(res, "kode_wilayah sudah terdaftar", 409);
        }
      }

      const result = await prisma.kopdes_hub_sch_referensi_wilayah.update({
        where: { kode_wilayah },
        data: {
          ...(nextKodeWilayah !== undefined && { kode_wilayah: nextKodeWilayah }),
          ...(provinsi !== undefined && { provinsi }),
          ...(kab_kota !== undefined && { kab_kota }),
          ...(kecamatan !== undefined && { kecamatan }),
          ...(desa_kelurahan !== undefined && { desa_kelurahan }),
          diperbarui_pada: new Date(),
        },
      });

      return successResponse(res, "Referensi wilayah berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const kode_wilayah = req.params.id as string;

      const existing = await prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
        where: { kode_wilayah },
        select: { kode_wilayah: true },
      });

      if (!existing) {
        return errorResponse(res, "Referensi wilayah tidak ditemukan", 404);
      }

      const anggotaCount = await prisma.kopdes_hub_sch_anggota_koperasi.count({
        where: { kode_wilayah },
      });

      if (anggotaCount > 0) {
        return errorResponse(
          res,
          "Referensi wilayah tidak dapat dihapus karena masih digunakan anggota koperasi",
          409,
        );
      }

      await prisma.kopdes_hub_sch_referensi_wilayah.delete({
        where: { kode_wilayah },
      });

      return successResponse(res, "Referensi wilayah berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default ReferensiWilayahController;
