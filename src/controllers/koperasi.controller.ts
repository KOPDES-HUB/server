import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";

type GenderGroupRow = {
  jenis_kelamin: string | null;
  _count: { anggota_ref: number };
};

function normalizeGenderCount(groups: GenderGroupRow[]) {
  let perempuan = 0;
  let laki_laki = 0;
  let lainnya = 0;

  for (const row of groups) {
    const jk = (row.jenis_kelamin ?? "").toUpperCase().trim();
    const count = row._count.anggota_ref;

    if (jk === "PEREMPUAN" || jk === "P") {
      perempuan += count;
    } else if (
      jk === "LAKI-LAKI" ||
      jk === "LAKI LAKI" ||
      jk === "L"
    ) {
      laki_laki += count;
    } else {
      lainnya += count;
    }
  }

  return {
    total: perempuan + laki_laki + lainnya,
    perempuan,
    laki_laki,
    lainnya,
  };
}

function toNumber(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

const KoperasiController = {
  getInformasiByKoperasiRef: async (req: Request, res: Response) => {
    try {
      const koperasi_ref = req.params.koperasi_ref as string;

      if (!koperasi_ref?.trim()) {
        return errorResponse(res, "koperasi_ref wajib diisi", 400);
      }

      const referensi =
        await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
          where: { koperasi_ref },
        });

      if (!referensi) {
        return errorResponse(res, "Koperasi tidak ditemukan", 404);
      }

      const [
        profil,
        wilayah,
        anggotaList,
        genderGroups,
        karyawanList,
        pengurusList,
        ratList,
        simpananList,
        transaksiList,
      ] = await Promise.all([
        prisma.kopdes_hub_sch_profil_koperasi.findUnique({
          where: { koperasi_ref },
        }),
        referensi.kode_wilayah
          ? prisma.kopdes_hub_sch_referensi_wilayah.findUnique({
              where: { kode_wilayah: referensi.kode_wilayah },
            })
          : Promise.resolve(null),
        prisma.kopdes_hub_sch_anggota_koperasi.findMany({
          where: { koperasi_ref },
          orderBy: { nama: "asc" },
          include: {
            kopdes_hub_sch_referensi_wilayah: {
              select: {
                kode_wilayah: true,
                provinsi: true,
                kab_kota: true,
                kecamatan: true,
                desa_kelurahan: true,
              },
            },
          },
        }),
        prisma.kopdes_hub_sch_anggota_koperasi.groupBy({
          by: ["jenis_kelamin"],
          where: { koperasi_ref },
          _count: { anggota_ref: true },
        }),
        prisma.kopdes_hub_sch_karyawan_koperasi.findMany({
          where: { koperasi_ref },
          orderBy: { nama: "asc" },
        }),
        prisma.kopdes_hub_sch_pengurus_koperasi.findMany({
          where: { koperasi_ref },
          orderBy: { nama: "asc" },
        }),
        prisma.kopdes_hub_sch_rat_koperasi.findMany({
          where: { koperasi_ref },
          orderBy: { tahun_buku: "desc" },
        }),
        prisma.kopdes_hub_sch_simpanan_anggota.findMany({
          where: { koperasi_ref },
          orderBy: { dibuat_pada: "desc" },
          include: {
            kopdes_hub_sch_anggota_koperasi: {
              select: {
                anggota_ref: true,
                nama: true,
                nomor_kta: true,
              },
            },
          },
        }),
        prisma.kopdes_hub_sch_transaksi_penjualan.findMany({
          where: { koperasi_ref },
          orderBy: { tanggal_dibuat: "desc" },
        }),
      ]);

      const agregasiJenisKelamin = normalizeGenderCount(genderGroups);

      const simpananMapped = simpananList.map((item) => ({
        ...item,
        jumlah_simpanan: toNumber(item.jumlah_simpanan),
      }));

      const transaksiMapped = transaksiList.map((item) => ({
        ...item,
        total_pembayaran: toNumber(item.total_pembayaran),
      }));

      const totalSimpanan = simpananMapped.reduce(
        (sum, item) => sum + (item.jumlah_simpanan ?? 0),
        0,
      );

      const totalPenjualanPaid = transaksiMapped
        .filter((t) => t.status_transaksi === "Paid")
        .reduce((sum, t) => sum + (t.total_pembayaran ?? 0), 0);

      return successResponse(res, "Informasi koperasi berhasil diambil", {
        koperasi_ref,
        referensi_koperasi_wilayah: referensi,
        referensi_wilayah: wilayah,
        profil_koperasi: profil,
        anggota_koperasi: {
          data: anggotaList,
          agregasi: {
            ...agregasiJenisKelamin,
            PEREMPUAN: agregasiJenisKelamin.perempuan,
            "LAKI-LAKI": agregasiJenisKelamin.laki_laki,
          },
        },
        karyawan_koperasi: {
          data: karyawanList,
          total: karyawanList.length,
        },
        pengurus_koperasi: {
          data: pengurusList,
          total: pengurusList.length,
        },
        rat_koperasi: {
          data: ratList,
          total: ratList.length,
        },
        simpanan_anggota: {
          data: simpananMapped,
          total: simpananMapped.length,
          total_jumlah_simpanan: totalSimpanan,
        },
        transaksi_penjualan: {
          data: transaksiMapped,
          total: transaksiMapped.length,
          total_pembayaran_paid: totalPenjualanPaid,
        },
        ringkasan: {
          total_anggota: anggotaList.length,
          anggota_perempuan: agregasiJenisKelamin.perempuan,
          anggota_laki_laki: agregasiJenisKelamin.laki_laki,
          total_karyawan: karyawanList.length,
          total_pengurus: pengurusList.length,
          total_rat: ratList.length,
          total_simpanan: simpananMapped.length,
          total_transaksi_penjualan: transaksiMapped.length,
        },
      });
    } catch (error) {
      return errorResponse(
        res,
        "Gagal mengambil informasi koperasi",
        500,
        error,
      );
    }
  },
};

export default KoperasiController;
