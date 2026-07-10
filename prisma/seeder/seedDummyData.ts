import { PrismaClient } from "../../generated/prisma/client";

export default async function seedDummyData(prisma: PrismaClient) {
  console.log(
    "📝 Seeding Dummy Data (Projects, Assignments, Notifications)...",
  );

  // Create Project
  const project1 = await prisma.project.create({
    data: {
      id: "p1",
      code: "BIT-2026-001",
      name: "Sistem Manajemen Proyek Internal BIT",
      description:
        "Pengembangan sistem manajemen proyek untuk kebutuhan internal PT. BIT",
      status: "ACTIVE",
      contractStatus: "CONTRACTED",
      year: 2026,
      contractValue: 150000000,
      contractStart: new Date("2026-01-01"),
      contractEnd: new Date("2026-12-31"),
      ownerId: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91",
    },
  });

  const project2 = await prisma.project.create({
    data: {
      id: "p2",
      code: "BIT-2026-002",
      name: "Revamp Landing Page Corporate",
      description: "Membuat ulang landing page menggunakan Next.js",
      status: "ACTIVE",
      contractStatus: "POTENTIAL",
      year: 2026,
      ownerId: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91",
    },
  });

  // Create Assignments
  // Yosep (Admin): c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91
  // Alddy (Pegawai): d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02

  const now = new Date();

  // Assignment 1 (Pending)
  const a1 = await prisma.assignment.create({
    data: {
      projectId: project1.id,
      assignedById: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91",
      assignedToId: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02",
      title: "Desain Database Schema",
      description: "Buat desain ERD dan Prisma schema untuk aplikasi",
      startDatetime: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Kemarin
      endDatetime: new Date(now.getTime() + 48 * 60 * 60 * 1000), // Lusa
      status: "PENDING",
    },
  });

  // Assignment 2 (In Progress)
  const a2 = await prisma.assignment.create({
    data: {
      projectId: project1.id,
      assignedById: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91",
      assignedToId: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02",
      title: "Setup Frontend Vite + Tailwind",
      description: "Inisialisasi template frontend",
      startDatetime: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      endDatetime: new Date(now.getTime() + 24 * 60 * 60 * 1000),
      status: "IN_PROGRESS",
    },
  });

  // Assignment 3 (Completed)
  const a3 = await prisma.assignment.create({
    data: {
      projectId: project2.id,
      assignedById: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91",
      assignedToId: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02",
      title: "Riset Kompetitor",
      description: "Riset desain landing page kompetitor",
      startDatetime: new Date(now.getTime() - 72 * 60 * 60 * 1000),
      endDatetime: new Date(now.getTime() - 48 * 60 * 60 * 1000),
      status: "COMPLETED",
      completedAt: new Date(now.getTime() - 50 * 60 * 60 * 1000),
    },
  });

  // Assignment 4 (Late)
  const a4 = await prisma.assignment.create({
    data: {
      projectId: project2.id,
      assignedById: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91",
      assignedToId: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02",
      title: "Pembuatan Aset Grafis",
      description: "Bikin aset logo dan banner",
      startDatetime: new Date(now.getTime() - 120 * 60 * 60 * 1000),
      endDatetime: new Date(now.getTime() - 24 * 60 * 60 * 1000), // Udah lewat kemaren
      status: "PENDING",
    },
  });

  // Create Notifications for Alddy
  await prisma.notification.createMany({
    data: [
      {
        userId: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02",
        title: "Tugas Baru",
        message: "Anda ditugaskan pada: Desain Database Schema",
        link: "/my-tasks",
        isRead: false,
        createdAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
      },
      {
        userId: "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02",
        title: "Tugas Terlambat",
        message: "Tugas 'Pembuatan Aset Grafis' telah melewati batas waktu!",
        link: "/my-tasks",
        isRead: true,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
    ],
  });

  // Create Notification for Yosep
  await prisma.notification.create({
    data: {
      userId: "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91",
      title: "Tugas Diselesaikan",
      message: "Mochamad Alddy telah menyelesaikan tugas 'Riset Kompetitor'",
      link: "/assignments",
      isRead: false,
      createdAt: new Date(now.getTime() - 49 * 60 * 60 * 1000),
    },
  });

  console.log("✅ Dummy Data seeded.");
}
