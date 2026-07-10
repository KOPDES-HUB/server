import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  RatKoperasiCreateSchema,
  RatKoperasiUpdateSchema,
} from "../schemas/ratKoperasi.schema";

const includeRelations = {
  kopdes_hub_sch_referensi_koperasi_wilayah: {
    select: {
      koperasi_ref: true,
      kode_wilayah: true,
    },
  },
};

const RatKoperasiController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_rat_koperasi.findMany({
        orderBy: { dibuat_pada: "desc" },
        include: includeRelations,
      });

      return successResponse(res, "Data RAT koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data RAT koperasi", 500, error);
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
        const numericSearch = Number(search);
        where.OR = [
          { rat_sample_id: { contains: search } },
          { jenis_sektor_koperasi: { contains: search, mode: "insensitive" } },
          { urutan_rat: { contains: search, mode: "insensitive" } },
          { status_rat: { contains: search, mode: "insensitive" } },
          { tahap_rat: { contains: search, mode: "insensitive" } },
          ...(!Number.isNaN(numericSearch)
            ? [
                { tahun_buku: numericSearch },
                { tahun_rencana_kerja: numericSearch },
                { tahun_rencana_anggaran: numericSearch },
              ]
            : []),
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_rat_koperasi.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: includeRelations,
        }),
        prisma.kopdes_hub_sch_rat_koperasi.count({ where }),
      ]);

      return successResponse(res, "Data RAT koperasi berhasil diambil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data RAT koperasi", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const rat_sample_id = req.params.id as string;

      const data = await prisma.kopdes_hub_sch_rat_koperasi.findUnique({
        where: { rat_sample_id },
        include: includeRelations,
      });

      if (!data) {
        return errorResponse(res, "RAT koperasi tidak ditemukan", 404);
      }

      return successResponse(res, "Detail RAT koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail RAT koperasi", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = RatKoperasiCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const { rat_sample_id, koperasi_ref, tanggal_rat, ...body } =
        parseResult.data;
      const finalRatSampleId = rat_sample_id ?? crypto.randomUUID();

      const [existingRat, koperasi] = await Promise.all([
        prisma.kopdes_hub_sch_rat_koperasi.findUnique({
          where: { rat_sample_id: finalRatSampleId },
          select: { rat_sample_id: true },
        }),
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        }),
      ]);

      if (existingRat) {
        return errorResponse(res, "rat_sample_id sudah terdaftar", 409);
      }

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      const now = new Date();
      const result = await prisma.kopdes_hub_sch_rat_koperasi.create({
        data: {
          rat_sample_id: finalRatSampleId,
          koperasi_ref,
          ...body,
          tanggal_rat: tanggal_rat ? new Date(tanggal_rat) : null,
          dibuat_pada: now,
          diperbarui_pada: now,
        },
        include: includeRelations,
      });

      return successResponse(res, "RAT koperasi berhasil dibuat", result, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const rat_sample_id = req.params.id as string;
      const parseResult = RatKoperasiUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing = await prisma.kopdes_hub_sch_rat_koperasi.findUnique({
        where: { rat_sample_id },
        select: { rat_sample_id: true },
      });

      if (!existing) {
        return errorResponse(res, "RAT koperasi tidak ditemukan", 404);
      }

      const { koperasi_ref, tanggal_rat, ...body } = parseResult.data;

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

      const result = await prisma.kopdes_hub_sch_rat_koperasi.update({
        where: { rat_sample_id },
        data: {
          ...(koperasi_ref !== undefined && { koperasi_ref }),
          ...body,
          ...(tanggal_rat !== undefined && {
            tanggal_rat: tanggal_rat ? new Date(tanggal_rat) : null,
          }),
          diperbarui_pada: new Date(),
        },
        include: includeRelations,
      });

      return successResponse(res, "RAT koperasi berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const rat_sample_id = req.params.id as string;

      const existing = await prisma.kopdes_hub_sch_rat_koperasi.findUnique({
        where: { rat_sample_id },
        select: { rat_sample_id: true },
      });

      if (!existing) {
        return errorResponse(res, "RAT koperasi tidak ditemukan", 404);
      }

      await prisma.kopdes_hub_sch_rat_koperasi.delete({
        where: { rat_sample_id },
      });

      return successResponse(res, "RAT koperasi berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default RatKoperasiController;
