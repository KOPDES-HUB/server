import z from "zod";


export const LoginSchema = z.object({
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),

  password: z.string().min(1, "Password wajib diisi"),
});

export const ChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Password lama wajib diisi"),
    password: z.string().min(1, "Password baru wajib diisi"),
    confirmPassword: z.string().min(1, "Konfirmasi password wajib diisi"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Password tidak cocok",
    path: ["confirmPassword"],
  });

export type ChangePasswordDTO = z.infer<typeof ChangePasswordSchema>;

export const UpdateProfileSchema = z.object({
  username: z.string().min(1, "Nama lengkap wajib diisi").trim(),
  email: z
    .string()
    .min(1, "Email wajib diisi")
    .email("Format email tidak valid"),
  removeAvatar: z.enum(["true", "false"]).optional(),
});

