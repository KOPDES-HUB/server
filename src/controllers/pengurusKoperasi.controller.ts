import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  PengurusKoperasiCreateSchema,
  PengurusKoperasiUpdateSchema,
} from "../schemas/pengurusKoperasi.schema";

const includeRelations = {
  kopdes_hub_sch_referensi_koperasi_wilayah: {
    select: {
      koperasi_ref: true,
      kode_wilayah: true,
    },
  },
};

const PengurusKoperasiController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_pengurus_koperasi.findMany({
        orderBy: { dibuat_pada: "desc" },
        include: includeRelations,
      });

      return successResponse(res, "Data pengurus koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data pengurus koperasi", 500, error);
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
          { pengurus_ref: { contains: search } },
          { jabatan: { contains: search, mode: "insensitive" } },
          { status: { contains: search, mode: "insensitive" } },
          { no_hp: { contains: search } },
          { email: { contains: search, mode: "insensitive" } },
          { alamat: { contains: search, mode: "insensitive" } },
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_pengurus_koperasi.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: includeRelations,
        }),
        prisma.kopdes_hub_sch_pengurus_koperasi.count({ where }),
      ]);

      return successResponse(res, "Data pengurus koperasi berhasil diambil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data pengurus koperasi", 500, error);
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const pengurus_ref = req.params.id as string;

      const data = await prisma.kopdes_hub_sch_pengurus_koperasi.findUnique({
        where: { pengurus_ref },
        include: includeRelations,
      });

      if (!data) {
        return errorResponse(res, "Pengurus koperasi tidak ditemukan", 404);
      }

      return successResponse(res, "Detail pengurus koperasi berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil detail pengurus koperasi", 500, error);
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = PengurusKoperasiCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        pengurus_ref,
        koperasi_ref,
        nama,
        jabatan,
        status,
        no_hp,
        nik,
        jenis_kelamin,
        foto_profil,
        email,
        alamat,
        kode_pos,
        tanggal_lahir,
        status_pendidikan,
        periode_mulai,
        periode_selesai,
        file_ktp,
        sumber_data,
      } = parseResult.data;

      const finalPengurusRef = pengurus_ref ?? crypto.randomUUID();

      const [existingPengurus, koperasi] = await Promise.all([
        prisma.kopdes_hub_sch_pengurus_koperasi.findUnique({
          where: { pengurus_ref: finalPengurusRef },
          select: { pengurus_ref: true },
        }),
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        }),
      ]);

      if (existingPengurus) {
        return errorResponse(res, "pengurus_ref sudah terdaftar", 409);
      }

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      if (nik) {
        const duplicateNik =
          await prisma.kopdes_hub_sch_pengurus_koperasi.findFirst({
            where: { nik, koperasi_ref },
            select: { pengurus_ref: true },
          });

        if (duplicateNik) {
          return errorResponse(res, "NIK sudah terdaftar di koperasi ini", 409);
        }
      }

      if (email) {
        const duplicateEmail =
          await prisma.kopdes_hub_sch_pengurus_koperasi.findFirst({
            where: { email, koperasi_ref },
            select: { pengurus_ref: true },
          });

        if (duplicateEmail) {
          return errorResponse(res, "Email sudah terdaftar di koperasi ini", 409);
        }
      }

      const now = new Date();

      const result = await prisma.kopdes_hub_sch_pengurus_koperasi.create({
        data: {
          pengurus_ref: finalPengurusRef,
          koperasi_ref,
          nama,
          jabatan,
          status,
          no_hp,
          nik,
          jenis_kelamin,
          foto_profil,
          email,
          alamat,
          kode_pos,
          tanggal_lahir,
          status_pendidikan,
          periode_mulai,
          periode_selesai: periode_selesai ? new Date(periode_selesai) : null,
          file_ktp,
          sumber_data,
          dibuat_pada: now,
          diperbarui_pada: now,
        },
        include: includeRelations,
      });

      return successResponse(res, "Pengurus koperasi berhasil dibuat", result, 201);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const pengurus_ref = req.params.id as string;

      const parseResult = PengurusKoperasiUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing = await prisma.kopdes_hub_sch_pengurus_koperasi.findUnique({
        where: { pengurus_ref },
        select: {
          pengurus_ref: true,
          koperasi_ref: true,
          nik: true,
          email: true,
        },
      });

      if (!existing) {
        return errorResponse(res, "Pengurus koperasi tidak ditemukan", 404);
      }

      const {
        koperasi_ref,
        nama,
        jabatan,
        status,
        no_hp,
        nik,
        jenis_kelamin,
        foto_profil,
        email,
        alamat,
        kode_pos,
        tanggal_lahir,
        status_pendidikan,
        periode_mulai,
        periode_selesai,
        file_ktp,
        sumber_data,
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
          await prisma.kopdes_hub_sch_pengurus_koperasi.findFirst({
            where: {
              nik,
              koperasi_ref: koperasi_ref ?? existing.koperasi_ref,
              NOT: { pengurus_ref },
            },
            select: { pengurus_ref: true },
          });

        if (duplicateNik) {
          return errorResponse(res, "NIK sudah terdaftar di koperasi ini", 409);
        }
      }

      if (email && email !== existing.email) {
        const duplicateEmail =
          await prisma.kopdes_hub_sch_pengurus_koperasi.findFirst({
            where: {
              email,
              koperasi_ref: koperasi_ref ?? existing.koperasi_ref,
              NOT: { pengurus_ref },
            },
            select: { pengurus_ref: true },
          });

        if (duplicateEmail) {
          return errorResponse(res, "Email sudah terdaftar di koperasi ini", 409);
        }
      }

      const result = await prisma.kopdes_hub_sch_pengurus_koperasi.update({
        where: { pengurus_ref },
        data: {
          ...(koperasi_ref !== undefined && { koperasi_ref }),
          ...(nama !== undefined && { nama }),
          ...(jabatan !== undefined && { jabatan }),
          ...(status !== undefined && { status }),
          ...(no_hp !== undefined && { no_hp }),
          ...(nik !== undefined && { nik }),
          ...(jenis_kelamin !== undefined && { jenis_kelamin }),
          ...(foto_profil !== undefined && { foto_profil }),
          ...(email !== undefined && { email }),
          ...(alamat !== undefined && { alamat }),
          ...(kode_pos !== undefined && { kode_pos }),
          ...(tanggal_lahir !== undefined && { tanggal_lahir }),
          ...(status_pendidikan !== undefined && { status_pendidikan }),
          ...(periode_mulai !== undefined && { periode_mulai }),
          ...(periode_selesai !== undefined && {
            periode_selesai: periode_selesai ? new Date(periode_selesai) : null,
          }),
          ...(file_ktp !== undefined && { file_ktp }),
          ...(sumber_data !== undefined && { sumber_data }),
          diperbarui_pada: new Date(),
        },
        include: includeRelations,
      });

      return successResponse(res, "Pengurus koperasi berhasil diupdate", result);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const pengurus_ref = req.params.id as string;

      const existing = await prisma.kopdes_hub_sch_pengurus_koperasi.findUnique({
        where: { pengurus_ref },
        select: { pengurus_ref: true, nama: true },
      });

      if (!existing) {
        return errorResponse(res, "Pengurus koperasi tidak ditemukan", 404);
      }

      await prisma.kopdes_hub_sch_pengurus_koperasi.delete({
        where: { pengurus_ref },
      });

      return successResponse(
        res,
        `Pengurus ${existing.nama ?? existing.pengurus_ref} berhasil dihapus`,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default PengurusKoperasiController;
