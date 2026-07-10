import { z } from "zod";

const optionalString = z.string().optional().nullable();
const optionalDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid",
  })
  .optional()
  .nullable();

const decimalField = z
  .union([
    z.coerce.number().min(0, "Total pembayaran tidak boleh kurang dari 0"),
    z.string().regex(/^\d+(\.\d+)?$/, "Total pembayaran tidak valid"),
  ])
  .optional()
  .nullable();

const TransaksiPenjualanBaseSchema = z.object({
  koperasi_ref: z.string().min(1, "Koperasi wajib diisi"),
  nama_pelanggan: optionalString,
  tanggal_dibuat: optionalDateString,
  total_pembayaran: decimalField,
  status_transaksi: optionalString,
  metode_pembayaran: optionalString,
});

export const TransaksiPenjualanCreateSchema =
  TransaksiPenjualanBaseSchema.extend({
    transaksi_sample_id: z
      .string()
      .min(1, "transaksi_sample_id tidak valid")
      .optional(),
  });

export const TransaksiPenjualanUpdateSchema =
  TransaksiPenjualanBaseSchema.partial();

export type TransaksiPenjualanCreateDTO = z.infer<
  typeof TransaksiPenjualanCreateSchema
>;
export type TransaksiPenjualanUpdateDTO = z.infer<
  typeof TransaksiPenjualanUpdateSchema
>;
