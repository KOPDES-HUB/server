import { PrismaClient } from "../../generated/prisma/client";

export default async function seedMenus(prisma: PrismaClient) {
  console.log("📂 Seeding Menus...");

  // Tahap 1: Parent/Root Menus (parentId = null)
  const homeParent = await prisma.menu.create({
    data: {
      id: "a0a5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "Home",
      url: "/home",
      icon: "Home",
      sequence: 1,
      module: "menu",
      type: "MENU",
      permId: "624c3a96-84fa-4c33-b04c-1a311e282d37",
    },
  });

  const dashboardParent = await prisma.menu.create({
    data: {
      id: "a1a5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "Dashboard",
      url: "#",
      icon: "LayoutDashboard",
      sequence: 2,
      module: "menu",
      type: "MENU",
      permId: "224c3a96-84fa-4c33-b04c-1a311e282d33",
    },
  });

  // Children under Dashboard parent
  await prisma.menu.createMany({
    data: [
      {
        id: "a1a5be74-104c-4e1d-ac6b-d868cc7a6935",
        name: "Dashboard Penugasan",
        url: "/dashboard",
        icon: "LayoutDashboard",
        sequence: 1,
        parentId: dashboardParent.id,
        module: "menu",
        type: "MENU",
        permId: "224c3a96-84fa-4c33-b04c-1a311e282d33",
      },
      {
        id: "a3a5be74-104c-4e1d-ac6b-d868cc7a6934",
        name: "Dashboard Pelaksanaan",
        url: "/dashboard-execution",
        icon: "Presentation",
        sequence: 2,
        parentId: dashboardParent.id,
        module: "menu",
        type: "MENU",
        permId: "224c3a96-84fa-4c33-b04c-1a311e282d33",
      },
      {
        id: "a1a5be74-104c-4e1d-ac6b-d868cc7a6936",
        name: "Dashboard Cuti",
        url: "/dashboard-leaves",
        icon: "CalendarOff",
        sequence: 3,
        parentId: dashboardParent.id,
        module: "menu",
        type: "MENU",
        permId: "224c3a96-84fa-4c33-b04c-1a311e282d33",
      },
    ],
  });

  const masterPekerjaanParent = await prisma.menu.create({
    data: {
      id: "b15d1610-62d2-4ad5-9300-20108108dfae",
      name: "Master Pekerjaan",
      url: "/projects",
      icon: "Briefcase",
      sequence: 3,
      module: "menu",
      type: "MENU",
      permId: "424c3a96-84fa-4c33-b04c-1a311e282d35",
    },
  });

  const penugasanParent = await prisma.menu.create({
    data: {
      id: "b25d1610-62d2-4ad5-9300-20108108dfae",
      name: "Penugasan",
      url: "/assignments",
      icon: "ListTodo",
      sequence: 4,
      module: "menu",
      type: "MENU",
      permId: "524c3a96-84fa-4c33-b04c-1a311e282d36",
    },
  });

  const myTasksParent = await prisma.menu.create({
    data: {
      id: "a2a5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "Tugas Saya",
      url: "/my-tasks",
      icon: "CheckCircle",
      sequence: 5,
      module: "menu",
      type: "MENU",
      permId: "324c3a96-84fa-4c33-b04c-1a311e282d34",
    },
  });

  const myActivitiesParent = await prisma.menu.create({
    data: {
      id: "a4a5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "Aktivitas Saya",
      url: "/my-activities",
      icon: "ClipboardList",
      sequence: 6,
      module: "menu",
      type: "MENU",
      permId: "724c3a96-84fa-4c33-b04c-1a311e282d38",
    },
  });

  const employeeActivitiesParent = await prisma.menu.create({
    data: {
      id: "a5a5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "Aktivitas Pegawai",
      url: "/employee-activities",
      icon: "Activity",
      sequence: 7,
      module: "menu",
      type: "MENU",
      permId: "824c3a96-84fa-4c33-b04c-1a311e282d39",
    },
  });

  const usersListParent = await prisma.menu.create({
    data: {
      id: "a6a5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "Daftar Pengguna",
      url: "/employees",
      icon: "Users2",
      sequence: 8,
      module: "menu",
      type: "MENU",
      permId: "624c3a96-84fa-4c33-b04c-1a311e282d37",
    },
  });

  const rbacParent = await prisma.menu.create({
    data: {
      id: "aaa5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "RBAC",
      url: "#",
      icon: "Settings",
      sequence: 9,
      module: "menu",
      type: "MENU",
      permId: "124c3a96-84fa-4c33-b04c-1a311e282d32",
    },
  });

  const leaveParent = await prisma.menu.create({
    data: {
      id: "a7a5be74-104c-4e1d-ac6b-d868cc7a6933",
      name: "Pengajuan Cuti",
      url: "/leaves",
      icon: "CalendarOff",
      sequence: 10,
      module: "menu",
      type: "MENU",
      permId: "924c3a96-84fa-4c33-b04c-1a311e282d40",
    },
  });

  // Tahap 2: Children Menus (hanya untuk RBAC)
  await prisma.menu.createMany({
    data: [
      {
        id: "c55d1610-62d2-4ad5-9300-20108108dfae",
        name: "Menu",
        url: "/menus",
        icon: "Menu",
        sequence: 1,
        parentId: rbacParent.id,
        module: "menu",
        type: "MENU",
        permId: "124c3a96-84fa-4c33-b04c-1a311e282d32",
      },
      {
        id: "17b5bc0d-174f-4250-98cb-f9c6d1abe1ae",
        name: "Pengguna",
        url: "/users",
        icon: "Users2",
        sequence: 2,
        parentId: rbacParent.id,
        module: "menu",
        type: "MENU",
        permId: "124c3a96-84fa-4c33-b04c-1a311e282d32",
      },
      {
        id: "3fda97dc-cdef-4e7f-845b-43fa21dfe5d6",
        name: "Role & Hak Akses",
        url: "/roles",
        icon: "KeyRound",
        sequence: 3,
        parentId: rbacParent.id,
        module: "menu",
        type: "MENU",
        permId: "124c3a96-84fa-4c33-b04c-1a311e282d32",
      },
      {
        id: "9a8af062-2c0f-4f89-b249-7fcc6eaa574d",
        name: "Permissions",
        url: "/permissions",
        icon: "ShieldUser",
        sequence: 4,
        parentId: rbacParent.id,
        module: "menu",
        type: "MENU",
        permId: "124c3a96-84fa-4c33-b04c-1a311e282d32",
      },
    ],
  });

  await prisma.menu.create({
    data: {
      id: "b5a5be74-104c-4e1d-ac6b-d868cc7a6935",
      name: "Notifikasi Telegram",
      url: "/settings/notification",
      icon: "BellRing",
      sequence: 11,
      module: "menu",
      type: "MENU",
      permId: "624c3a96-84fa-4c33-b04c-1a311e282d37", // HOME permission
    },
  });

  await prisma.menu.create({
    data: {
      id: "b5a5be74-104c-4e1d-ac6b-d868cc7a6936",
      name: "Informasi Teknis & Administrasi Aplikasi",
      url: "/application-info",
      icon: "FolderGit2",
      sequence: 12,
      module: "menu",
      type: "MENU",
      permId: "b24c3a96-84fa-4c33-b04c-1a311e282d41", // INFORMASI_APLIKASI permission
    },
  });

  await prisma.menu.create({
    data: {
      id: "b5a5be74-104c-4e1d-ac6b-d868cc7a6937",
      name: "Laporan Penugasan",
      url: "/assignment-report",
      icon: "FileSpreadsheet",
      sequence: 13,
      module: "menu",
      type: "MENU",
      permId: "c24c3a96-84fa-4c33-b04c-1a311e282d42", // LAPORAN_PENUGASAN permission
    },
  });

  console.log("✅ Menus seeded.");
}
