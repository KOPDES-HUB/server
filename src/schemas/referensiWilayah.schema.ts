import { z } from "zod";

const optionalString = z.string().optional().nullable();

const ReferensiWilayahBaseSchema = z.object({
  provinsi: optionalString,
  kab_kota: optionalString,
  kecamatan: optionalString,
  desa_kelurahan: optionalString,
  kode_wilayah: z.string().min(1, "Kode wilayah wajib diisi"),
});

export const ReferensiWilayahCreateSchema = ReferensiWilayahBaseSchema;

export const ReferensiWilayahUpdateSchema =
  ReferensiWilayahBaseSchema.partial();

export type ReferensiWilayahCreateDTO = z.infer<
  typeof ReferensiWilayahCreateSchema
>;
export type ReferensiWilayahUpdateDTO = z.infer<
  typeof ReferensiWilayahUpdateSchema
>;
