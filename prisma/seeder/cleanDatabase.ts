import { PrismaClient } from "../../generated/prisma/client";

export default async function cleanDatabase(prisma: PrismaClient) {
  console.log("🧹 Cleaning database...");

  // 1. Hapus tabel yang bergantung pada orang lain (Level 3 - Junctions & Logs)
  // Menghapus log audit dan token sesi terlebih dahulu
  await prisma.systemAuditLog.deleteMany();
  await prisma.authUserToken.deleteMany();
  await prisma.authLoginAttempt.deleteMany();

  // Menghapus relasi Many-to-Many
  await prisma.authPermToGroup.deleteMany();
  await prisma.authUserToGroup.deleteMany();

  // 2. Hapus data aplikasi
  await prisma.leaveRequest.deleteMany();
  await prisma.activity.deleteMany();
  await prisma.assignmentLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.project.deleteMany();
  await prisma.applicationInfoFile.deleteMany();
  await prisma.applicationInfoTeam.deleteMany();
  await prisma.applicationInfo.deleteMany();

  // 3. Hapus tabel Master / Struktur (Level 1)
  // Menu dihapus sebelum AuthPerm karena menu punya perm_id
  await prisma.menu.deleteMany();

  // Sekarang aman untuk menghapus tabel induk utama
  await prisma.authPerm.deleteMany();
  await prisma.authGroup.deleteMany();
  await prisma.authUser.deleteMany();

  console.log("✨ Database is now clean.");
}
