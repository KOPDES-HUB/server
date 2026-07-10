import { PrismaClient } from "../../generated/prisma/client";

export default async function seedAuthGroups(prisma: PrismaClient) {
  console.log("👥 Seeding Auth Groups...");

  await prisma.authGroup.createMany({
    data: [
      {
        id: "7f5dd362-ce40-4a22-ac9c-5cb1d9fd219d", // default group
        name: "Pegawai",
        definition: "Pegawai / Staff",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "71504c7f-1475-4099-bf11-7b8b8b6c45f6", // admin group
        name: "Admin",
        definition: "Admin / Senior Pemberi Tugas",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "9c3c12f0-1a22-4212-bf9e-83ccde27c814",
        name: "Superadmin",
        definition: "Superadmin",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
    skipDuplicates: true,
  });

  console.log("✅ Auth Groups seeded.");
}
