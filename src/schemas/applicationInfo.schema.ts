import { z } from "zod";

export const ApplicationInfoCreateSchema = z.object({
  namaInstansi: z.string().min(1, "Nama instansi wajib diisi").max(255),
  namaProyek: z.string().min(1, "Nama proyek wajib diisi").max(255),
  tahunProyek: z.coerce.number().int().min(1900, "Tahun tidak valid").max(2100, "Tahun tidak valid"),
  picClient: z.string().max(255).optional().nullable(),
  picNo: z.string().max(15).optional().nullable(),
  informasiTeknisDev: z.string().optional().nullable(),
  informasiTeknisProd: z.string().optional().nullable(),
  teamIds: z.preprocess(
    (val) => {
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch {
          return val ? [val] : [];
        }
      }
      return val;
    },
    z.array(z.string().uuid("ID User tidak valid")).optional().default([])
  ),
});

export const ApplicationInfoEditSchema = ApplicationInfoCreateSchema;
