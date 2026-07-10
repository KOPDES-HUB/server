import { z } from "zod";

export const UserCreateSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),

  password: z
    .string()
    .min(1, "Password wajib diisi")
    .min(8, "Password minimal 8 karakter"),

  username: z.string().min(1, "Nama lengkap wajib diisi").trim(),
  roles: z.array(z.string().uuid()).optional(),

  noWA: z
    .string()
    .regex(/^62\d{8,13}$/, "Format no WA: 62xxxxxxxxxx")
    .optional()
    .nullable(),
});

export const UserEditSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  username: z.string().min(1, "Username wajib diisi").trim(),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .optional()
    .or(z.literal("")),
  roles: z.array(z.string().uuid()).optional(),
  noWA: z
    .string()
    .regex(/^62\d{8,13}$/, "Format no WA: 62xxxxxxxxxx")
    .optional()
    .nullable(),
});
