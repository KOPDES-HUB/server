import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { errorResponse, successResponse } from "../lib/response";

  export const getAll = async (req: Request, res: Response) => {
    try {
      const data = await prisma.kopdes_hub_sch_profil_koperasi.findMany({
        orderBy: {
          nama_koperasi: "asc",
        },
      });
  
      return successResponse(res, "Data berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Gagal mengambil data", 500, error);
    }
  };

  export const getById = async (req: Request, res: Response) => {
    try {
      const koperasi_ref = req.params.koperasi_ref as string;
  
      const data =
        await prisma.kopdes_hub_sch_profil_koperasi.findUnique({
          where: {
            koperasi_ref,
          },
        });
  
      if (!data) {
        return errorResponse(res, "Data tidak ditemukan", 404);
      }
  
      return successResponse(res, "Detail berhasil diambil", data);
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan", 500, error);
    }
  };

  export const getPagination = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const page = Number(req.query.page) || 1;
      const limit = Number(req.query.limit) || 10;
      const search = (req.query.search as string) || "";
  
      const skip = (page - 1) * limit;
  
      const where: any = search
        ? {
            OR: [
              {
                nama_koperasi: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                nik_koperasi: {
                  contains: search,
                  mode: "insensitive",
                },
              },
              {
                alamat_lengkap: {
                  contains: search,
                  mode: "insensitive",
                },
              },
            ],
          }
        : {};
  
      const [result, total] = await Promise.all([
        prisma.kopdes_hub_sch_profil_koperasi.findMany({
          where,
          skip,
          take: limit,
          orderBy: {
            nama_koperasi: "asc",
          },
        }),
        prisma.kopdes_hub_sch_profil_koperasi.count({
          where,
        }),
      ]);
  
      return successResponse(res, "Berhasil", {
        result,
        total,
        current_page: page,
        total_pages: Math.ceil(total / limit),
      });
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan", 500, error);
    }
  };

  export const create = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const body = req.body;
  
      const exist =
        await prisma.kopdes_hub_sch_profil_koperasi.findUnique({
          where: {
            koperasi_ref: body.koperasi_ref,
          },
        });
  
      if (exist) {
        return errorResponse(
          res,
          "Profil koperasi sudah ada",
          409,
        );
      }
  
      const data =
        await prisma.kopdes_hub_sch_profil_koperasi.create({
          data: body,
        });
  
      return successResponse(
        res,
        "Berhasil membuat data",
        data,
        201,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan", 500, error);
    }
  };

  export const edit = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const koperasi_ref = req.params.koperasi_ref as string;
  
      const exist =
        await prisma.kopdes_hub_sch_profil_koperasi.findUnique({
          where: {
            koperasi_ref,
          },
        });
  
      if (!exist) {
        return errorResponse(
          res,
          "Data tidak ditemukan",
          404,
        );
      }
  
      const data =
        await prisma.kopdes_hub_sch_profil_koperasi.update({
          where: {
            koperasi_ref,
          },
          data: {
            ...req.body,
            diperbarui_pada: new Date(),
          },
        });
  
      return successResponse(
        res,
        "Berhasil memperbarui data",
        data,
      );
    } catch (error) {
      return errorResponse(res, "Terjadi kesalahan", 500, error);
    }
  };

  function calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ) {
    const R = 6371;
  
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
  
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) ** 2;
  
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }
  
  export const checkLocation = async (
    req: Request,
    res: Response,
  ) => {
    try {
      const { lat, long } = req.body;
  
      const koperasi =
        await prisma.kopdes_hub_sch_profil_koperasi.findMany({
          where: {
            koordinat_dibulatkan: {
              not: null,
            },
          },
        });
  
      // let nearest = null;
      // let minDistance = Number.MAX_VALUE;
  
      // for (const item of koperasi) {
      //   if (!item.koordinat_dibulatkan) continue;
  
      //   // diasumsikan format:
      //   // longitude,latitude
      //   const [lng, latitude] =
      //     item.koordinat_dibulatkan.split(",").map(Number);
  
      //   const distance = calculateDistance(
      //     lat,
      //     long,
      //     latitude,
      //     lng,
      //   );
  
      //   if (distance < minDistance) {
      //     minDistance = distance;
  
      //     nearest = {
      //       ...item,
      //       distance,
      //     };
      //   }
      // }

      const radius = 5; // kilometer

      const result = [];

      for (const item of koperasi) {
          if (!item.koordinat_dibulatkan) continue;

          const [lng, latitude] =
              item.koordinat_dibulatkan.split(",").map(Number);

          const distance = calculateDistance(
              lat,
              long,
              latitude,
              lng,
          );

          if (distance <= radius) {
              result.push({
                  ...item,
                  distance,
              });
          }
      }

      result.sort((a, b) => a.distance - b.distance);

      return successResponse(
          res,
          "Lokasi koperasi terdekat",
          result,
      );
  
      // return successResponse(
      //   res,
      //   "Lokasi terdekat ditemukan",
      //   nearest,
      // );
    } catch (error) {
      return errorResponse(
        res,
        "Terjadi kesalahan",
        500,
        error,
      );
    }
  };

  const ProfilKoperasiController = {
    getAll,
    getPagination,
    getById,
    create,
    edit,
    checkLocation,
  };
  
  export default ProfilKoperasiController;
