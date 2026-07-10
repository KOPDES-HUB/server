import { PrismaClient } from "../../generated/prisma/client";

export default async function seedUserToGroups(prisma: PrismaClient) {
  console.log("🔗 Connecting Users to Groups...");

  await prisma.authUserToGroup.createMany({
    data: [
      {
        userId: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91", // Yosep
        groupId: "71504c7f-1475-4099-bf11-7b8b8b6c45f6", // Admin
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02", // Alddy
        groupId: "7f5dd362-ce40-4a22-ac9c-5cb1d9fd219d", // Pegawai
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        userId: "e3f5a145-3f6c-6f9c-af6d-4d6f1e3f5a14", // Superadmin
        groupId: "9c3c12f0-1a22-4212-bf9e-83ccde27c814", // Superadmin Group
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  console.log("✅ User to Group relations seeded.");
}
