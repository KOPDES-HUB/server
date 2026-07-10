import { z } from "zod";

const optionalString = z.string().optional().nullable();
const optionalDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid",
  })
  .optional()
  .nullable();

const SimpananAnggotaBaseSchema = z.object({
  koperasi_ref: z.string().min(1, "Koperasi wajib diisi"),
  anggota_ref: z.string().min(1, "Anggota wajib diisi"),
  periode_pembayaran: optionalString,
  jumlah_simpanan: z
    .union([
      z.coerce.number().min(0, "Jumlah simpanan tidak boleh kurang dari 0"),
      z.string().regex(/^\d+(\.\d+)?$/, "Jumlah simpanan tidak valid"),
    ])
    .optional()
    .nullable(),
  status: optionalString,
  dibayar_pada: optionalDateString,
});

export const SimpananAnggotaCreateSchema = SimpananAnggotaBaseSchema.extend({
  simpanan_ref: z.string().uuid("simpanan_ref tidak valid").optional(),
});

export const SimpananAnggotaUpdateSchema = SimpananAnggotaBaseSchema.partial();

export type SimpananAnggotaCreateDTO = z.infer<
  typeof SimpananAnggotaCreateSchema
>;
export type SimpananAnggotaUpdateDTO = z.infer<
  typeof SimpananAnggotaUpdateSchema
>;
