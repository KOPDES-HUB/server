import { PrismaClient } from "../../generated/prisma/client";

export default async function seedAuthPerms(prisma: PrismaClient) {
  console.log("🛡️ Seeding Auth Permissions...");

  await prisma.authPerm.createMany({
    data: [
      {
        id: "624c3a96-84fa-4c33-b04c-1a311e282d37",
        name: "HOME",
        definition: "Home",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "124c3a96-84fa-4c33-b04c-1a311e282d32",
        name: "RBAC",
        definition: "RBAC",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "224c3a96-84fa-4c33-b04c-1a311e282d33",
        name: "DASHBOARD",
        definition: "Dashboard",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "324c3a96-84fa-4c33-b04c-1a311e282d34",
        name: "MY_TASKS",
        definition: "Tugas Saya",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "424c3a96-84fa-4c33-b04c-1a311e282d35",
        name: "MANAGE_PROJECT",
        definition: "Manajemen Proyek",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "524c3a96-84fa-4c33-b04c-1a311e282d36",
        name: "MANAGE_ASSIGNMENT",
        definition: "Manajemen Penugasan",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "724c3a96-84fa-4c33-b04c-1a311e282d38",
        name: "MY_ACTIVITIES",
        definition: "Aktivitas Saya",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "824c3a96-84fa-4c33-b04c-1a311e282d39",
        name: "EMPLOYEE_ACTIVITIES",
        definition: "Aktivitas Pegawai",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "924c3a96-84fa-4c33-b04c-1a311e282d40",
        name: "LEAVE_REQUEST",
        definition: "Pengajuan Cuti",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "b24c3a96-84fa-4c33-b04c-1a311e282d41",
        name: "INFORMASI_APLIKASI",
        definition: "Informasi Teknis & Administrasi Aplikasi",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "c24c3a96-84fa-4c33-b04c-1a311e282d42",
        name: "LAPORAN_PENUGASAN",
        definition: "Laporan Penugasan",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  console.log("✅ Auth Permissions seeded.");
}
