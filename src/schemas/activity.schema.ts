import { z } from "zod";

export const ActivityCreateSchema = z.object({
  projectId: z.string().uuid("Project ID tidak valid").or(z.literal("")).optional().nullable(),
  assignedById: z.string().uuid("Assigned By ID tidak valid").or(z.literal("")).optional().nullable(),
  title: z.string().min(1, "Judul aktivitas wajib diisi").max(200),
  description: z.string().optional().nullable(),
  startDatetime: z.string().datetime("Format tanggal mulai tidak valid"),
  endDatetime: z.string().datetime("Format deadline tidak valid"),
  status: z.enum(["PENDING", "PENDING_STATUS", "IN_PROGRESS", "COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"]).optional(),
});

export type ActivityCreateDTO = z.infer<typeof ActivityCreateSchema>;

export const ActivityEditSchema = ActivityCreateSchema;

export type ActivityEditDTO = z.infer<typeof ActivityEditSchema>;
