import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";

async function main() {
  const connectionString = `${process.env.DATABASE_URL}`;
  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log("🌱 Seeding LEAVE_REQUEST permission & menu...");
    // 1. Permission
    const perm = await prisma.authPerm.upsert({
      where: { id: "924c3a96-84fa-4c33-b04c-1a311e282d40" },
      update: {},
      create: {
        id: "924c3a96-84fa-4c33-b04c-1a311e282d40",
        name: "LEAVE_REQUEST",
        definition: "Pengajuan Cuti",
      },
    });
    console.log("Permission:", perm.name);

    // 2. Mappings
    const groups = [
      "7f5dd362-ce40-4a22-ac9c-5cb1d9fd219d", // Pegawai
      "71504c7f-1475-4099-bf11-7b8b8b6c45f6", // Admin
      "9c3c12f0-1a22-4212-bf9e-83ccde27c814", // Superadmin
    ];
    for (const group_id of groups) {
      await prisma.authPermToGroup.upsert({
        where: { permId_groupId: { permId: perm.id, groupId: group_id } },
        update: {},
        create: {
          permId: perm.id,
          groupId: group_id,
          canCreate: 1,
          canRead: 1,
          canUpdate: 1,
          canDelete: 1,
        },
      });
    }
    console.log("Permission mapped to groups.");

    // 3. Menu
    const menu = await prisma.menu.upsert({
      where: { id: "a7a5be74-104c-4e1d-ac6b-d868cc7a6933" },
      update: {},
      create: {
        id: "a7a5be74-104c-4e1d-ac6b-d868cc7a6933",
        name: "Pengajuan Cuti",
        url: "/leaves",
        icon: "CalendarOff",
        sequence: 10,
        module: "menu",
        type: "MENU",
        permId: perm.id,
      },
    });
    console.log("Menu created:", menu.name);
    console.log("✅ Leave menu seeding finished successfully.");
  } catch (error) {
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
