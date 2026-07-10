import { Request, Response } from "express";
import argon2 from "argon2";
import { prisma } from "../lib/prisma";
import { successResponse, errorResponse } from "../lib/response";

const generateNomorKta = (): string => {
  const part = () => String(Math.floor(1000 + Math.random() * 9000));
  return `${part()} ${part()} ${part()} ${part()}`;
};

export const register = async (req: Request, res: Response) => {
  try {
    const {
      nama,
      email,
      password,
      nik,
      noWA,
      koperasiRef,
      alamatLengkap,
      fileKtp,
      fileSelfieKtp,
    } = req.body;

    if (!nama || !email || !password || !nik || !koperasiRef) {
      return errorResponse(res, "Data belum lengkap", 400);
    }

    const koperasi =
      await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
        where: { koperasi_ref: koperasiRef },
        select: { koperasi_ref: true },
      });

    if (!koperasi) {
      return errorResponse(res, "Koperasi tidak ditemukan", 404);
    }

    const exist = await prisma.authUser.findFirst({
      where: {
        OR: [{ email }, { nik }],
      },
    });

    if (exist) {
      return errorResponse(res, "Email atau NIK sudah terdaftar", 409);
    }

    const hash = await argon2.hash(password);

    const user = await prisma.authUser.create({
      data: {
        username: nama,
        email,
        password: hash,
        nik,
        noWA: noWA ?? null,
        koperasiRef,
        alamatLengkap: alamatLengkap ?? null,
        fileKtp: fileKtp ?? null,
        fileSelfieKtp: fileSelfieKtp ?? null,
        statusRegistrasi: "DIAJUKAN",
      },
      select: {
        id: true,
        username: true,
        email: true,
        nik: true,
        noWA: true,
        koperasiRef: true,
        statusRegistrasi: true,
        createdAt: true,
      },
    });

    return successResponse(
      res,
      "Pendaftaran berhasil, silakan menunggu persetujuan admin.",
      user,
      201,
    );
  } catch (error) {
    return errorResponse(res, "Terjadi kesalahan", 500, error);
  }
};

/**
 * Admin menyetujui registrasi → buat record anggota + KTA.
 * Syarat: statusRegistrasi = DISETUJUI & status_keanggotaan = AKTIF
 */
export const approveRegistration = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;

    const user = await prisma.authUser.findUnique({
      where: { id: userId },
      include: { anggota: true },
    });

    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (user.statusRegistrasi !== "DIAJUKAN") {
      return errorResponse(
        res,
        "Hanya registrasi berstatus DIAJUKAN yang dapat disetujui",
        400,
      );
    }

    if (user.anggota) {
      return errorResponse(res, "User sudah memiliki data anggota", 409);
    }

    if (!user.koperasiRef) {
      return errorResponse(res, "Data koperasi pada pendaftaran tidak lengkap", 400);
    }

    const koperasi =
      await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.findUnique({
        where: { koperasi_ref: user.koperasiRef },
        select: { koperasi_ref: true },
      });

    if (!koperasi) {
      return errorResponse(res, "Koperasi tidak ditemukan", 404);
    }

    if (user.nik) {
      const duplicateNik =
        await prisma.kopdes_hub_sch_anggota_koperasi.findFirst({
          where: {
            koperasi_ref: user.koperasiRef,
            nik: user.nik,
          },
          select: { anggota_ref: true },
        });

      if (duplicateNik) {
        return errorResponse(
          res,
          "NIK sudah terdaftar sebagai anggota di koperasi ini",
          409,
        );
      }
    }

    const now = new Date();
    let nomorKta = generateNomorKta();

    // Pastikan nomor KTA unik
    while (
      await prisma.kopdes_hub_sch_anggota_koperasi.findFirst({
        where: { nomor_kta: nomorKta },
      })
    ) {
      nomorKta = generateNomorKta();
    }

    const result = await prisma.$transaction(async (tx) => {
      const anggota = await tx.kopdes_hub_sch_anggota_koperasi.create({
        data: {
          userId: user.id,
          koperasi_ref: user.koperasiRef!,
          nama: user.username,
          nik: user.nik,
          alamat_lengkap: user.alamatLengkap,
          file_ktp: user.fileKtp,
          file_selfie_ktp: user.fileSelfieKtp,
          status_keanggotaan: "AKTIF",
          nomor_kta: nomorKta,
          tanggal_terdaftar: now,
          dibuat_pada: now,
          diperbarui_pada: now,
        },
      });

      const updatedUser = await tx.authUser.update({
        where: { id: userId },
        data: { statusRegistrasi: "DISETUJUI" },
        select: {
          id: true,
          username: true,
          email: true,
          statusRegistrasi: true,
        },
      });

      return { user: updatedUser, anggota };
    });

    return successResponse(
      res,
      "Registrasi disetujui. KTA berhasil diterbitkan.",
      result,
    );
  } catch (error) {
    return errorResponse(res, "Terjadi kesalahan", 500, error);
  }
};

export const rejectRegistration = async (req: Request, res: Response) => {
  try {
    const userId = req.params.id as string;
    const { alasanPenolakan } = req.body;

    const user = await prisma.authUser.findUnique({
      where: { id: userId },
      select: { id: true, statusRegistrasi: true },
    });

    if (!user) {
      return errorResponse(res, "User tidak ditemukan", 404);
    }

    if (user.statusRegistrasi !== "DIAJUKAN") {
      return errorResponse(
        res,
        "Hanya registrasi berstatus DIAJUKAN yang dapat ditolak",
        400,
      );
    }

    const updated = await prisma.authUser.update({
      where: { id: userId },
      data: {
        statusRegistrasi: "DITOLAK",
        alasanPenolakan: alasanPenolakan ?? null,
      },
      select: {
        id: true,
        username: true,
        email: true,
        statusRegistrasi: true,
        alasanPenolakan: true,
      },
    });

    return successResponse(res, "Registrasi ditolak", updated);
  } catch (error) {
    return errorResponse(res, "Terjadi kesalahan", 500, error);
  }
};
