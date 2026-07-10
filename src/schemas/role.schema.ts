import z from "zod";

const RoleBaseSchema = z.object({
  name: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(100, "Nama terlalu panjang"),
  definition: z
    .string()
    .min(3, "Definisi minimal 3 karakter")
    .max(100, "Definisi terlalu panjang"),
});

export const RoleCreateSchema = RoleBaseSchema;
export const RoleEditSchema = RoleBaseSchema;
