import { z } from "zod";

export const ProjectCreateSchema = z.object({
  code: z.string().min(1, "Kode wajib diisi").max(20),
  name: z.string().min(1, "Nama proyek wajib diisi").max(200),
  description: z.string().optional().nullable(),
  contractStatus: z.enum(["POTENTIAL", "NOT_CONTRACTED", "CONTRACTED"]),
  category: z.enum(["PROJECT", "PRODUCT", "OTHERS"]).optional().default("PROJECT"),
  ownerId: z.preprocess(
    (val) => (val === "" || val === null || val === undefined || val === "none" ? null : val),
    z.string().uuid("ID Owner tidak valid").nullable().optional()
  ),
  year: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().int().min(1900, "Tahun minimal 1900").max(2100, "Tahun maksimal 2100").nullable().optional()
  ),
  contractValue: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : Number(val)),
    z.number().min(0, "Nilai kontrak tidak boleh negatif").nullable().optional()
  ),
  contractStart: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : new Date(val as string)),
    z.date().nullable().optional()
  ),
  contractEnd: z.preprocess(
    (val) => (val === "" || val === null || val === undefined ? null : new Date(val as string)),
    z.date().nullable().optional()
  ),
}).superRefine((data, ctx) => {
  if (data.contractStatus === "CONTRACTED") {
    if (data.contractValue === null || data.contractValue === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nilai kontrak wajib diisi jika status Sudah Kontrak",
        path: ["contractValue"],
      });
    }
    if (!data.contractStart) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tanggal mulai kontrak wajib diisi jika status Sudah Kontrak",
        path: ["contractStart"],
      });
    }
    if (!data.contractEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tanggal akhir kontrak wajib diisi jika status Sudah Kontrak",
        path: ["contractEnd"],
      });
    }
    if (data.contractStart && data.contractEnd && data.contractStart > data.contractEnd) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Tanggal akhir kontrak tidak boleh sebelum tanggal mulai",
        path: ["contractEnd"],
      });
    }
  }
});

export const ProjectEditSchema = ProjectCreateSchema.extend({
  status: z.enum(["ACTIVE", "COMPLETED", "ON_HOLD"]).optional(),
});
