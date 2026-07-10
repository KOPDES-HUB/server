import { z } from "zod";

const optionalString = z.string().optional().nullable();

const ReferensiKoperasiWilayahBaseSchema = z.object({
  koperasi_ref: z.string().min(1, "Koperasi ref wajib diisi"),
  kode_wilayah: optionalString,
});

export const ReferensiKoperasiWilayahCreateSchema =
  ReferensiKoperasiWilayahBaseSchema;

export const ReferensiKoperasiWilayahUpdateSchema =
  ReferensiKoperasiWilayahBaseSchema.partial();

export type ReferensiKoperasiWilayahCreateDTO = z.infer<
  typeof ReferensiKoperasiWilayahCreateSchema
>;
export type ReferensiKoperasiWilayahUpdateDTO = z.infer<
  typeof ReferensiKoperasiWilayahUpdateSchema
>;
