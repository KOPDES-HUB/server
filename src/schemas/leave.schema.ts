import { z } from "zod";

export const LeaveCreateSchema = z.object({
  managerId: z.string().uuid("ID Atasan tidak valid"),
  financeId: z.string().uuid("ID Keuangan tidak valid"),
  startDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal mulai tidak valid",
  }),
  endDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Format tanggal selesai tidak valid",
  }),
  reason: z.string().min(5, "Alasan cuti minimal 5 karakter"),
});

export type LeaveCreateDTO = z.infer<typeof LeaveCreateSchema>;

export const LeaveStatusUpdateSchema = z.object({
  status: z.enum(["APPROVED", "REJECTED"], {
    message: "Status harus APPROVED atau REJECTED",
  }),
  target: z.enum(["MANAGER", "FINANCE"], {
    message: "Target harus MANAGER atau FINANCE",
  }),
});

export type LeaveStatusUpdateDTO = z.infer<typeof LeaveStatusUpdateSchema>;
