import { PrismaClient } from "../../generated/prisma/client";

export default async function seedUsers(prisma: PrismaClient) {
  console.log("👤 Seeding Users...");

  await prisma.authUser.createMany({
    data: [
      {
        id: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91", // Yosep
        email: "yosep.rohayadi83@gmail.com",
        password:
          "$argon2id$v=19$m=65536,t=3,p=4$qsuesQSgbQNV53WuIQgAtA$JkXh/fSxgJre/IEZ2YDwvgKuaxG+ohT0lPgs69o53aY", // Password default "password" atau sejenisnya
        username: "Yosep Rohayadi",
        banned: false,
        lastLogin: new Date(),
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02", // Alddy
        email: "alddy1933@gmail.com",
        password:
          "$argon2id$v=19$m=65536,t=3,p=4$qsuesQSgbQNV53WuIQgAtA$JkXh/fSxgJre/IEZ2YDwvgKuaxG+ohT0lPgs69o53aY", // Password default "password" atau sejenisnya
        username: "Mochamad Alddy",
        banned: false,
        lastLogin: new Date(),
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: "e3f5a145-3f6c-6f9c-af6d-4d6f1e3f5a14", // Superadmin
        email: "superadmin@gmail.com",
        password:
          "$argon2id$v=19$m=65536,t=3,p=4$qsuesQSgbQNV53WuIQgAtA$JkXh/fSxgJre/IEZ2YDwvgKuaxG+ohT0lPgs69o53aY", // Password default "password"
        username: "Superadmin",
        banned: false,
        lastLogin: new Date(),
        lastActivity: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ],
  });

  console.log("✅ Users seeded.");
}
