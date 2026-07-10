import { z } from "zod";

const optionalString = z.string().optional().nullable();

const KaryawanKoperasiBaseSchema = z.object({
  koperasi_ref: z.string().min(1, "Koperasi wajib diisi"),
  nama: optionalString,
  jabatan: optionalString,
  nomor_hp_karyawan: optionalString,
  jenis_kelamin: z.enum(["L", "P"], {
    message: "Jenis kelamin harus L atau P",
  }).optional().nullable(),
  nik: z
    .string()
    .regex(/^\d{16}$/, "NIK harus 16 digit angka")
    .optional()
    .nullable(),
  email: z.string().email("Email tidak valid").optional().nullable(),
  status_karyawan: optionalString,
});

export const KaryawanKoperasiCreateSchema = KaryawanKoperasiBaseSchema.extend({
  karyawan_ref: z.string().uuid("karyawan_ref tidak valid").optional(),
});

export const KaryawanKoperasiUpdateSchema =
  KaryawanKoperasiBaseSchema.partial();

export type KaryawanKoperasiCreateDTO = z.infer<
  typeof KaryawanKoperasiCreateSchema
>;
export type KaryawanKoperasiUpdateDTO = z.infer<
  typeof KaryawanKoperasiUpdateSchema
>;
