import z from "zod";

const PermissionBaseSchema = z.object({
  name: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama terlalu panjang"),
  definition: z
    .string()
    .min(3, "Definisi minimal 3 karakter")
    .max(100, "Definisi terlalu panjang"),
});

export const PermissionCreateSchema = PermissionBaseSchema;
export const PermissionEditSchema = PermissionBaseSchema;
