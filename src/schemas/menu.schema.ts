import z from "zod";

const MenuBaseSchema = z.object({
  name: z
    .string()
    .min(3, "Nama minimal 3 karakter")
    .max(50, "Nama terlalu panjang"),

  url: z.string().min(1, "URL wajib diisi").max(250, "URL terlalu panjang"),

  icon: z.string().min(1, "Icon wajib diisi").max(100, "Icon terlalu panjang"),

  sequence: z
    .number()
    .int("Sequence harus bilangan bulat")
    .nonnegative("Sequence tidak boleh negatif"),

  parentId: z.string().optional().nullable(),

  module: z
    .string()
    .min(2, "Module minimal 2 karakter")
    .max(20, "Module terlalu panjang"),

  type: z.enum(["MENU", "SUBMENU", "BUTTON"], {
    message: "Type harus MENU, SUBMENU, atau BUTTON",
  }),

  permId: z.string().min(1, "Permission wajib dipilih"),
});

export const MenuCreateSchema = MenuBaseSchema;

export const MenuEditSchema = MenuBaseSchema.extend({
  id: z.string(),
});
