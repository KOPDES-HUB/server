import { z } from "zod";

const optionalString = z.string().optional().nullable();

const AnggotaKoperasiBaseSchema = z.object({
  koperasi_ref: z.string().min(1, "Koperasi wajib diisi"),
  nama: optionalString,
  nik: z
    .string()
    .regex(/^\d{16}$/, "NIK harus 16 digit angka")
    .optional()
    .nullable(),
  kode_wilayah: optionalString,
  jenis_kelamin: z.enum(["L", "P"], {
    message: "Jenis kelamin harus L atau P",
  }).optional().nullable(),
  status_keanggotaan: optionalString,
  tanggal_terdaftar: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), {
      message: "Format tanggal terdaftar tidak valid",
    })
    .optional()
    .nullable(),
  file_ktp: optionalString,
  status_akun: optionalString,
  pekerjaan: optionalString,
});

export const AnggotaKoperasiCreateSchema = AnggotaKoperasiBaseSchema.extend({
  anggota_ref: z.string().uuid("anggota_ref tidak valid").optional(),
});

export const AnggotaKoperasiUpdateSchema = AnggotaKoperasiBaseSchema.partial();

export type AnggotaKoperasiCreateDTO = z.infer<typeof AnggotaKoperasiCreateSchema>;
export type AnggotaKoperasiUpdateDTO = z.infer<typeof AnggotaKoperasiUpdateSchema>;