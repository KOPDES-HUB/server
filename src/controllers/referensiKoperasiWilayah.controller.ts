import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  ReferensiKoperasiWilayahCreateSchema,
  ReferensiKoperasiWilayahUpdateSchema,
} from "../schemas/referensiKoperasiWilayah.schema";

const ReferensiKoperasiWilayahController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findMany({
          orderBy: { dibuat_pada: "desc" },
        });

      return successResponse(
        res,
        "Data referensi koperasi wilayah berhasil diambil",
        data,
      );
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil data referensi koperasi wilayah",
        500,
        error,
      );
    }
  },

  getByPagination: async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = (req.query.search as string) || "";
      const sortBy = (req.query.sortBy as string) || "dibuat_pada";
      const sortOrder =
        (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

      const skip = (page - 1) * limit;
      const where: any = {};

      if (search) {
        where.OR = [
          { koperasi_ref: { contains: search } },
          { kode_wilayah: { contains: search } },
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
        }),
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.count({ where }),
      ]);

      return successResponse(
        res,
        "Data referensi koperasi wilayah berhasil diambil",
        {
          result,
          total,
          current_page: page,
          total_pages: Math.ceil(total / limit),
        },
      );
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil data referensi koperasi wilayah",
        500,
        error,
      );
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const koperasi_ref = req.params.id as string;

      const data =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          include: {
            kopdes_hub_sch_anggota_koperasi: true,
            kopdes_hub_sch_karyawan_koperasi: true,
            kopdes_hub_sch_pengurus_koperasi: true,
            kopdes_hub_sch_rat_koperasi: true,
            kopdes_hub_sch_simpanan_anggota: true,
          },
        });

      if (!data) {
        return errorResponse(
          res,
          "Referensi koperasi wilayah tidak ditemukan",
          404,
        );
      }

      return successResponse(
        res,
        "Detail referensi koperasi wilayah berhasil diambil",
        data,
      );
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil detail referensi koperasi wilayah",
        500,
        error,
      );
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = ReferensiKoperasiWilayahCreateSchema.safeParse(
        req.body,
      );
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { koperasi_ref, kode_wilayah } = parseResult.data;
      const existing =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        });

      if (existing) {
        return errorResponse(res, "koperasi_ref sudah terdaftar", 409);
      }

      const now = new Date();
      const result =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.create({
          data: {
            koperasi_ref,
            kode_wilayah,
            dibuat_pada: now,
            diperbarui_pada: now,
          },
        });

      return successResponse(
        res,
        "Referensi koperasi wilayah berhasil dibuat",
        result,
        201,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const koperasi_ref = req.params.id as string;
      const parseResult = ReferensiKoperasiWilayahUpdateSchema.safeParse(
        req.body,
      );
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        });

      if (!existing) {
        return errorResponse(
          res,
          "Referensi koperasi wilayah tidak ditemukan",
          404,
        );
      }

      const { koperasi_ref: nextKoperasiRef, kode_wilayah } = parseResult.data;

      if (nextKoperasiRef && nextKoperasiRef !== koperasi_ref) {
        const duplicate =
          await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
            where: { koperasi_ref: nextKoperasiRef },
            select: { koperasi_ref: true },
          });

        if (duplicate) {
          return errorResponse(res, "koperasi_ref sudah terdaftar", 409);
        }
      }

      const result =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.update({
          where: { koperasi_ref },
          data: {
            ...(nextKoperasiRef !== undefined && {
              koperasi_ref: nextKoperasiRef,
            }),
            ...(kode_wilayah !== undefined && { kode_wilayah }),
            diperbarui_pada: new Date(),
          },
        });

      return successResponse(
        res,
        "Referensi koperasi wilayah berhasil diupdate",
        result,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const koperasi_ref = req.params.id as string;

      const existing =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        });

      if (!existing) {
        return errorResponse(
          res,
          "Referensi koperasi wilayah tidak ditemukan",
          404,
        );
      }

      const [
        anggotaCount,
        karyawanCount,
        pengurusCount,
        ratCount,
        simpananCount,
      ] = await Promise.all([
        prisma.kopdes_hub_sch_anggota_koperasi.count({ where: { koperasi_ref } }),
        prisma.kopdes_hub_sch_karyawan_koperasi.count({ where: { koperasi_ref } }),
        prisma.kopdes_hub_sch_pengurus_koperasi.count({ where: { koperasi_ref } }),
        prisma.kopdes_hub_sch_rat_koperasi.count({ where: { koperasi_ref } }),
        prisma.kopdes_hub_sch_simpanan_anggota.count({ where: { koperasi_ref } }),
      ]);

      if (
        anggotaCount +
          karyawanCount +
          pengurusCount +
          ratCount +
          simpananCount >
        0
      ) {
        return errorResponse(
          res,
          "Referensi koperasi wilayah tidak dapat dihapus karena masih digunakan",
          409,
        );
      }

      await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.delete({
        where: { koperasi_ref },
      });

      return successResponse(res, "Referensi koperasi wilayah berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default ReferensiKoperasiWilayahController;
