import { z } from "zod";

export const AssignmentCreateSchema = z.object({
  projectId: z.string().uuid("Project ID tidak valid"),
  assignedToId: z.string().uuid("Assigned To ID tidak valid"),
  title: z.string().min(1, "Judul tugas wajib diisi").max(200),
  description: z.string().optional(),
  startDatetime: z.string().datetime("Format tanggal mulai tidak valid"),
  endDatetime: z.string().datetime("Format deadline tidak valid"),
});

export const AssignmentEditSchema = AssignmentCreateSchema.extend({
  status: z.enum(["PENDING", "PENDING_STATUS", "IN_PROGRESS", "COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"]).optional(),
});

export const AssignmentStatusSchema = z.object({
  status: z.enum(["PENDING", "PENDING_STATUS", "IN_PROGRESS", "COMPLETED", "COMPLETED_LATE", "LATE_WITH_REASON"]),
  note: z.string().optional(),
});
