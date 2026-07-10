import crypto from "crypto";
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";
import {
  calculateNPV,
  parseModalAwal,
  type ArusKasTahunan,
} from "../helpers/npv.helper";
import {
  TransaksiPenjualanCreateSchema,
  TransaksiPenjualanUpdateSchema,
} from "../schemas/transaksiPenjualan.schema";

const includeRelations = {
  kopdes_hub_sch_referensi_koperasi_wilayah: {
    select: {
      koperasi_ref: true,
      kode_wilayah: true,
    },
  },
};

type TrenPenjualanQueryRow = {
  periode: number | bigint;
  total_penjualan: unknown;
  jumlah_transaksi: number | bigint;
};

type ArusKasQueryRow = {
  koperasi_ref: string;
  arus_kas: unknown;
  tahun: number | bigint;
};

const BULAN_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "Mei", "Jun",
  "Jul", "Agu", "Sep", "Okt", "Nov", "Des",
];

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

function toNumber(value: unknown): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}

const TransaksiPenjualanController = {
  getAll: async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_transaksi_penjualan.findMany({
        orderBy: { diperbarui_pada: "desc" },
        include: includeRelations,
      });

      const koperasiRefs = [...new Set(data.map((row) => row.koperasi_ref))];
      const profils = await prisma.kopdes_hub_sch_profil_koperasi.findMany({
        where: { koperasi_ref: { in: koperasiRefs } },
        select: { koperasi_ref: true, nama_koperasi: true },
      });
      const namaByRef = new Map(
        profils.map((p) => [p.koperasi_ref, p.nama_koperasi]),
      );

      const enriched = data.map((row) => ({
        ...row,
        nama_koperasi: namaByRef.get(row.koperasi_ref) ?? null,
      }));

      return successResponse(
        res,
        "Data transaksi penjualan berhasil diambil",
        enriched,
      );
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil data transaksi penjualan",
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
      const koperasi_ref = (req.query.koperasi_ref as string) || "";
      const status_transaksi = (req.query.status_transaksi as string) || "";
      const sortBy = (req.query.sortBy as string) || "diperbarui_pada";
      const sortOrder =
        (req.query.sortOrder as string) === "asc" ? "asc" : "desc";

      const skip = (page - 1) * limit;
      const where: Record<string, unknown> = {};

      if (koperasi_ref) {
        where.koperasi_ref = koperasi_ref;
      }

      if (status_transaksi) {
        where.status_transaksi = status_transaksi;
      }

      if (search) {
        where.OR = [
          { transaksi_sample_id: { contains: search } },
          { nama_pelanggan: { contains: search, mode: "insensitive" } },
          { status_transaksi: { contains: search, mode: "insensitive" } },
          { metode_pembayaran: { contains: search, mode: "insensitive" } },
        ];
      }

      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_transaksi_penjualan.findMany({
          where,
          skip,
          take: limit,
          orderBy: { [sortBy]: sortOrder },
          include: includeRelations,
        }),
        prisma.kopdes_hub_sch_transaksi_penjualan.count({ where }),
      ]);

      return successResponse(res, "Data transaksi penjualan berhasil diambil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil data transaksi penjualan",
        500,
        error,
      );
    }
  },

  getTrenPenjualanByKoperasi: async (req: Request, res: Response) => {
    try {
      const koperasi_ref = req.params.koperasi_ref as string;
      const tahun = parseInt(req.query.tahun as string) || new Date().getFullYear();
      const bulanRaw = req.query.bulan as string | undefined;
      const bulan = bulanRaw ? parseInt(bulanRaw) : null;

      if (!koperasi_ref?.trim()) {
        return errorResponse(res, "koperasi_ref wajib diisi", 400);
      }

      if (Number.isNaN(tahun) || tahun < 2000 || tahun > 2100) {
        return errorResponse(res, "Parameter tahun tidak valid", 400);
      }

      if (bulan !== null && (Number.isNaN(bulan) || bulan < 1 || bulan > 12)) {
        return errorResponse(res, "Parameter bulan harus 1–12", 400);
      }

      const koperasi =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        });

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      const profil = await prisma.kopdes_hub_sch_profil_koperasi.findUnique({
        where: { koperasi_ref },
        select: { nama_koperasi: true },
      });

      let rows: TrenPenjualanQueryRow[];
      let granularity: "bulanan" | "harian";

      if (bulan !== null) {
        granularity = "harian";
        rows = await prisma.$queryRaw<TrenPenjualanQueryRow[]>`
          SELECT
            EXTRACT(DAY FROM tanggal_dibuat)::int AS periode,
            SUM(total_pembayaran) AS total_penjualan,
            COUNT(*)::int AS jumlah_transaksi
          FROM kopdes_hub_sch_transaksi_penjualan
          WHERE status_transaksi = 'Paid'
            AND koperasi_ref = ${koperasi_ref}
            AND tanggal_dibuat IS NOT NULL
            AND EXTRACT(YEAR FROM tanggal_dibuat)::int = ${tahun}
            AND EXTRACT(MONTH FROM tanggal_dibuat)::int = ${bulan}
          GROUP BY EXTRACT(DAY FROM tanggal_dibuat)
          ORDER BY periode ASC
        `;
      } else {
        granularity = "bulanan";
        rows = await prisma.$queryRaw<TrenPenjualanQueryRow[]>`
          SELECT
            EXTRACT(MONTH FROM tanggal_dibuat)::int AS periode,
            SUM(total_pembayaran) AS total_penjualan,
            COUNT(*)::int AS jumlah_transaksi
          FROM kopdes_hub_sch_transaksi_penjualan
          WHERE status_transaksi = 'Paid'
            AND koperasi_ref = ${koperasi_ref}
            AND tanggal_dibuat IS NOT NULL
            AND EXTRACT(YEAR FROM tanggal_dibuat)::int = ${tahun}
          GROUP BY EXTRACT(MONTH FROM tanggal_dibuat)
          ORDER BY periode ASC
        `;
      }

      const rowMap = new Map(
        rows.map((r) => [Number(r.periode), {
          total: toNumber(r.total_penjualan),
          count: Number(r.jumlah_transaksi),
        }]),
      );

      const maxPeriode =
        granularity === "bulanan" ? 12 : daysInMonth(tahun, bulan!);

      const tren = Array.from({ length: maxPeriode }, (_, i) => {
        const periode = i + 1;
        const entry = rowMap.get(periode);
        const label =
          granularity === "bulanan"
            ? BULAN_LABELS[periode - 1]
            : String(periode);
        return {
          periode,
          label,
          total_penjualan: entry?.total ?? 0,
          jumlah_transaksi: entry?.count ?? 0,
        };
      });

      const total_penjualan = tren.reduce((s, t) => s + t.total_penjualan, 0);
      const total_transaksi = tren.reduce((s, t) => s + t.jumlah_transaksi, 0);

      return successResponse(res, "Tren penjualan berhasil diambil", {
        koperasi_ref,
        nama_koperasi: profil?.nama_koperasi ?? null,
        tahun,
        bulan,
        granularity,
        tren,
        total_penjualan,
        total_transaksi,
      });
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil tren penjualan koperasi",
        500,
        error,
      );
    }
  },

  getArusKasDanNPV: async (req: Request, res: Response) => {
    try {
      const koperasi_ref = req.params.koperasi_ref as string;
      const discountRateRaw = parseFloat(
        (req.query.discount_rate as string) || "0.1",
      );

      if (!koperasi_ref?.trim()) {
        return errorResponse(res, "koperasi_ref wajib diisi", 400);
      }

      if (Number.isNaN(discountRateRaw) || discountRateRaw < 0) {
        return errorResponse(
          res,
          "discount_rate harus berupa angka >= 0",
          400,
        );
      }

      const [profil, rows] = await Promise.all([
        prisma.kopdes_hub_sch_profil_koperasi.findUnique({
          where: { koperasi_ref },
          select: {
            koperasi_ref: true,
            nama_koperasi: true,
            modal_awal: true,
          },
        }),
        prisma.$queryRaw<ArusKasQueryRow[]>`
          SELECT
            koperasi_ref,
            SUM(total_pembayaran) AS arus_kas,
            EXTRACT(YEAR FROM diperbarui_pada)::int AS tahun
          FROM kopdes_hub_sch_transaksi_penjualan
          WHERE status_transaksi = 'Paid'
            AND koperasi_ref = ${koperasi_ref}
          GROUP BY koperasi_ref, EXTRACT(YEAR FROM diperbarui_pada)
          ORDER BY tahun ASC
        `,
      ]);

      if (!profil) {
        return errorResponse(
          res,
          "Profil koperasi tidak ditemukan",
          404,
        );
      }

      const arusKasPerTahun: ArusKasTahunan[] = rows.map((row) => ({
        tahun: Number(row.tahun),
        arus_kas: toNumber(row.arus_kas),
      }));

      const modalAwal = parseModalAwal(profil.modal_awal);
      const npv = calculateNPV(modalAwal, arusKasPerTahun, discountRateRaw);

      return successResponse(res, "Arus kas & NPV koperasi berhasil dihitung", {
        koperasi_ref,
        nama_koperasi: profil.nama_koperasi,
        modal_awal_raw: profil.modal_awal,
        modal_awal: modalAwal,
        discount_rate: discountRateRaw,
        arus_kas_per_tahun: arusKasPerTahun.map(({ tahun, arus_kas }) => ({
          tahun,
          arus_kas,
        })),
        npv,
        interpretasi:
          npv.nilai >= 0
            ? "Proyeksi arus kas positif — investasi layak dievaluasi lebih lanjut"
            : "Proyeksi arus kas negatif — perlu evaluasi ulang strategi usaha",
      });
    } catch (error) {
      return errorResponse(
        res,
        "Gagal menghitung arus kas & NPV koperasi",
        500,
        error,
      );
    }
  },

  getById: async (req: Request, res: Response) => {
    try {
      const transaksi_sample_id = req.params.id as string;

      const data = await prisma.kopdes_hub_sch_transaksi_penjualan.findUnique({
        where: { transaksi_sample_id },
        include: includeRelations,
      });

      if (!data) {
        return errorResponse(res, "Transaksi penjualan tidak ditemukan", 404);
      }

      return successResponse(
        res,
        "Detail transaksi penjualan berhasil diambil",
        data,
      );
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil detail transaksi penjualan",
        500,
        error,
      );
    }
  },

  create: async (req: Request, res: Response) => {
    try {
      const parseResult = TransaksiPenjualanCreateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const {
        transaksi_sample_id,
        koperasi_ref,
        nama_pelanggan,
        tanggal_dibuat,
        total_pembayaran,
        status_transaksi,
        metode_pembayaran,
      } = parseResult.data;

      const finalId = transaksi_sample_id ?? crypto.randomUUID();

      const [existing, koperasi] = await Promise.all([
        prisma.kopdes_hub_sch_transaksi_penjualan.findUnique({
          where: { transaksi_sample_id: finalId },
          select: { transaksi_sample_id: true },
        }),
        prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
          select: { koperasi_ref: true },
        }),
      ]);

      if (existing) {
        return errorResponse(res, "transaksi_sample_id sudah terdaftar", 409);
      }

      if (!koperasi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      const now = new Date();
      const result = await prisma.kopdes_hub_sch_transaksi_penjualan.create({
        data: {
          transaksi_sample_id: finalId,
          koperasi_ref,
          nama_pelanggan,
          tanggal_dibuat: tanggal_dibuat ? new Date(tanggal_dibuat) : now,
          total_pembayaran,
          status_transaksi,
          metode_pembayaran,
          dibuat_pada: now,
          diperbarui_pada: now,
        },
        include: includeRelations,
      });

      return successResponse(
        res,
        "Transaksi penjualan berhasil dibuat",
        result,
        201,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  update: async (req: Request, res: Response) => {
    try {
      const transaksi_sample_id = req.params.id as string;
      const parseResult = TransaksiPenjualanUpdateSchema.safeParse(req.body);
      if (!parseResult.success) {
        return errorResponse(
          res,
          "Validasi gagal",
          400,
          parseResult.error.format(),
        );
      }

      const existing =
        await prisma.kopdes_hub_sch_transaksi_penjualan.findUnique({
          where: { transaksi_sample_id },
          select: { transaksi_sample_id: true, koperasi_ref: true },
        });

      if (!existing) {
        return errorResponse(res, "Transaksi penjualan tidak ditemukan", 404);
      }

      const {
        koperasi_ref,
        nama_pelanggan,
        tanggal_dibuat,
        total_pembayaran,
        status_transaksi,
        metode_pembayaran,
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

      const result = await prisma.kopdes_hub_sch_transaksi_penjualan.update({
        where: { transaksi_sample_id },
        data: {
          ...(koperasi_ref !== undefined && { koperasi_ref }),
          ...(nama_pelanggan !== undefined && { nama_pelanggan }),
          ...(tanggal_dibuat !== undefined && {
            tanggal_dibuat: tanggal_dibuat ? new Date(tanggal_dibuat) : null,
          }),
          ...(total_pembayaran !== undefined && { total_pembayaran }),
          ...(status_transaksi !== undefined && { status_transaksi }),
          ...(metode_pembayaran !== undefined && { metode_pembayaran }),
          diperbarui_pada: new Date(),
        },
        include: includeRelations,
      });

      return successResponse(
        res,
        "Transaksi penjualan berhasil diupdate",
        result,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },

  delete: async (req: Request, res: Response) => {
    try {
      const transaksi_sample_id = req.params.id as string;

      const existing =
        await prisma.kopdes_hub_sch_transaksi_penjualan.findUnique({
          where: { transaksi_sample_id },
          select: { transaksi_sample_id: true },
        });

      if (!existing) {
        return errorResponse(res, "Transaksi penjualan tidak ditemukan", 404);
      }

      await prisma.kopdes_hub_sch_transaksi_penjualan.delete({
        where: { transaksi_sample_id },
      });

      return successResponse(res, "Transaksi penjualan berhasil dihapus");
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan internal", 500, error);
    }
  },
};

export default TransaksiPenjualanController;
