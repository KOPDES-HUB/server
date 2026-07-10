import "dotenv/config";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import cleanDatabase from "./seeder/cleanDatabase";
import seedAuthGroups from "./seeder/seedAuthGroups";
import seedAuthPerms from "./seeder/seedAuthPerms";
import seedUsers from "./seeder/seedUsers";
import seedMenus from "./seeder/seedMenus";
import seedUserToGroups from "./seeder/seedUserToGroups";
import seedPermToGroups from "./seeder/seedPermToGroups";
import seedDummyData from "./seeder/seedDummyData";

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Starting seeding...");
  await cleanDatabase(prisma);
  await seedAuthGroups(prisma);
  await seedAuthPerms(prisma);
  await seedUsers(prisma);
  await seedMenus(prisma);
  await seedUserToGroups(prisma);
  await seedPermToGroups(prisma);
  await seedDummyData(prisma);
  console.log("✅ All data seeded successfully!");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
