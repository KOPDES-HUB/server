import { z } from "zod";

const optionalString = z.string().optional().nullable();
const optionalDateString = z
  .string()
  .refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal tidak valid",
  })
  .optional()
  .nullable();
const optionalSmallInt = z.coerce
  .number()
  .int("Harus berupa angka bulat")
  .min(0, "Tidak boleh kurang dari 0")
  .max(32767, "Nilai terlalu besar")
  .optional()
  .nullable();

const RatKoperasiBaseSchema = z.object({
  koperasi_ref: z.string().min(1, "Koperasi wajib diisi"),
  jenis_sektor_koperasi: optionalString,
  urutan_rat: optionalString,
  tahun_buku: optionalSmallInt,
  tahun_rencana_kerja: optionalSmallInt,
  tahun_rencana_anggaran: optionalSmallInt,
  tanggal_rat: optionalDateString,
  jumlah_peserta_rat: z.coerce
    .number()
    .int("Jumlah peserta RAT harus berupa angka bulat")
    .min(0, "Jumlah peserta RAT tidak boleh kurang dari 0")
    .optional()
    .nullable(),
  status_rat: optionalString,
  tahap_rat: optionalString,
  laporan_posisi_keuangan: optionalString,
  laporan_hasil_usaha: optionalString,
  rapb_posisi_keuangan: optionalString,
  rapb_hasil_usaha: optionalString,
});

export const RatKoperasiCreateSchema = RatKoperasiBaseSchema.extend({
  rat_sample_id: z.string().uuid("rat_sample_id tidak valid").optional(),
});

export const RatKoperasiUpdateSchema = RatKoperasiBaseSchema.partial();

export type RatKoperasiCreateDTO = z.infer<typeof RatKoperasiCreateSchema>;
export type RatKoperasiUpdateDTO = z.infer<typeof RatKoperasiUpdateSchema>;
