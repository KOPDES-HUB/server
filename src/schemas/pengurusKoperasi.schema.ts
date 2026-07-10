import { z } from "zod";

const optionalString = z.string().optional().nullable();
const optionalDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid",
  })
  .optional()
  .nullable();

const PengurusKoperasiBaseSchema = z.object({
  koperasi_ref: z.string().min(1, "Koperasi wajib diisi"),
  nama: optionalString,
  jabatan: optionalString,
  status: optionalString,
  no_hp: optionalString,
  nik: z
    .string()
    .regex(/^\d{16}$/, "NIK harus 16 digit angka")
    .optional()
    .nullable(),
  jenis_kelamin: z
    .enum(["L", "P"], {
      message: "Jenis kelamin harus L atau P",
    })
    .optional()
    .nullable(),
  foto_profil: optionalString,
  email: z.string().email("Email tidak valid").optional().nullable(),
  alamat: optionalString,
  kode_pos: optionalString,
  tanggal_lahir: optionalString,
  status_pendidikan: optionalString,
  periode_mulai: optionalString,
  periode_selesai: optionalDateString,
  file_ktp: optionalString,
  sumber_data: optionalString,
});

export const PengurusKoperasiCreateSchema = PengurusKoperasiBaseSchema.extend({
  pengurus_ref: z.string().uuid("pengurus_ref tidak valid").optional(),
});

export const PengurusKoperasiUpdateSchema =
  PengurusKoperasiBaseSchema.partial();

export type PengurusKoperasiCreateDTO = z.infer<
  typeof PengurusKoperasiCreateSchema
>;
export type PengurusKoperasiUpdateDTO = z.infer<
  typeof PengurusKoperasiUpdateSchema
>;
