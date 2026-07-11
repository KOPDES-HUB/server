import { PrismaClient } from "../../generated/prisma/client";

const ADMIN_ID = "c1b3f912-1f4a-4d7a-8f4b-2b4f9c1b3f91";
const MEMBER_ID = "d2c4e023-2e5b-5e8b-9e5c-3c5e0d2c4e02";
const SUPERADMIN_ID = "e3f5a145-3f6c-6f9c-af6d-4d6f1e3f5a14";

const KOPERASI_MERAH_PUTIH_REF = "KMP-JKT-001";
const KOPERASI_PANGAN_REF = "KMP-BDG-001";
const WILAYAH_JAKARTA = "3173011001";
const WILAYAH_BANDUNG = "3273011001";
const ANGGOTA_MEMBER_REF = "AGT-KMP-JKT-0001";
const ANGGOTA_ADMIN_REF = "AGT-KMP-JKT-0002";

export default async function seedDummyData(prisma: PrismaClient) {
  console.log("Seeding dummy data KOPDESHUB hackaton...");

  const now = new Date();
  const day = 24 * 60 * 60 * 1000;

  await prisma.authUser.update({
    where: { id: ADMIN_ID },
    data: {
      nik: "3173010101900001",
      noWA: "081234567801",
      statusRegistrasi: "DISETUJUI",
      koperasiRef: KOPERASI_MERAH_PUTIH_REF,
      alamatLengkap:
        "Jl. Merdeka Selatan No. 10, Gambir, Jakarta Pusat",
      fileKtp: "/uploads/dummy/ktp-yosep.jpg",
      fileSelfieKtp: "/uploads/dummy/selfie-yosep.jpg",
      isAdmin: true,
    },
  });

  await prisma.authUser.update({
    where: { id: MEMBER_ID },
    data: {
      nik: "3173010202920002",
      noWA: "081234567802",
      statusRegistrasi: "DISETUJUI",
      koperasiRef: KOPERASI_MERAH_PUTIH_REF,
      alamatLengkap:
        "Jl. Kebon Sirih No. 22, Gambir, Jakarta Pusat",
      fileKtp: "/uploads/dummy/ktp-alddy.jpg",
      fileSelfieKtp: "/uploads/dummy/selfie-alddy.jpg",
    },
  });

  await prisma.authUser.update({
    where: { id: SUPERADMIN_ID },
    data: {
      nik: "3173010303880003",
      noWA: "081234567803",
      statusRegistrasi: "DISETUJUI",
      isAdmin: true,
    },
  });

  await prisma.kopdes_hub_sch_referensi_wilayah.upsert({
    where: { kode_wilayah: WILAYAH_JAKARTA },
    update: {
      provinsi: "DKI Jakarta",
      kab_kota: "Kota Jakarta Pusat",
      kecamatan: "Gambir",
      desa_kelurahan: "Gambir",
      diperbarui_pada: now,
    },
    create: {
      kode_wilayah: WILAYAH_JAKARTA,
      provinsi: "DKI Jakarta",
      kab_kota: "Kota Jakarta Pusat",
      kecamatan: "Gambir",
      desa_kelurahan: "Gambir",
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_referensi_wilayah.upsert({
    where: { kode_wilayah: WILAYAH_BANDUNG },
    update: {
      provinsi: "Jawa Barat",
      kab_kota: "Kota Bandung",
      kecamatan: "Coblong",
      desa_kelurahan: "Dago",
      diperbarui_pada: now,
    },
    create: {
      kode_wilayah: WILAYAH_BANDUNG,
      provinsi: "Jawa Barat",
      kab_kota: "Kota Bandung",
      kecamatan: "Coblong",
      desa_kelurahan: "Dago",
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.upsert({
    where: { koperasi_ref: KOPERASI_MERAH_PUTIH_REF },
    update: {
      kode_wilayah: WILAYAH_JAKARTA,
      diperbarui_pada: now,
    },
    create: {
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      kode_wilayah: WILAYAH_JAKARTA,
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_referensi_koperasi_wilayah.upsert({
    where: { koperasi_ref: KOPERASI_PANGAN_REF },
    update: {
      kode_wilayah: WILAYAH_BANDUNG,
      diperbarui_pada: now,
    },
    create: {
      koperasi_ref: KOPERASI_PANGAN_REF,
      kode_wilayah: WILAYAH_BANDUNG,
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_profil_koperasi.upsert({
    where: { koperasi_ref: KOPERASI_MERAH_PUTIH_REF },
    update: {
      nama_koperasi: "Koperasi Desa Merah Putih Gambir",
      status_registrasi: "TERVERIFIKASI",
      bentuk_koperasi: "Koperasi Konsumen",
      kategori_usaha: "Sembako dan layanan anggota",
      nik_koperasi: "3173010001001",
      alamat_lengkap:
        "Jl. Medan Merdeka Selatan No. 12, Gambir, Jakarta Pusat",
      kode_pos: "10110",
      koordinat_dibulatkan: "-6.175392,106.827153",
      modal_awal: "250000000",
      sumber_persetujuan: "Dinas Koperasi",
      tentang_koperasi:
        "Koperasi percontohan untuk digitalisasi layanan anggota dan penjualan harian.",
      pola_pengelolaan: "Pengurus inti dan unit usaha harian",
      metode_pengisian: "Seeder hackaton",
      diperbarui_pada: now,
    },
    create: {
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama_koperasi: "Koperasi Desa Merah Putih Gambir",
      status_registrasi: "TERVERIFIKASI",
      bentuk_koperasi: "Koperasi Konsumen",
      kategori_usaha: "Sembako dan layanan anggota",
      nik_koperasi: "3173010001001",
      alamat_lengkap:
        "Jl. Medan Merdeka Selatan No. 12, Gambir, Jakarta Pusat",
      kode_pos: "10110",
      koordinat_dibulatkan: "-6.175392,106.827153",
      modal_awal: "250000000",
      sumber_persetujuan: "Dinas Koperasi",
      tentang_koperasi:
        "Koperasi percontohan untuk digitalisasi layanan anggota dan penjualan harian.",
      pola_pengelolaan: "Pengurus inti dan unit usaha harian",
      metode_pengisian: "Seeder hackaton",
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_profil_koperasi.upsert({
    where: { koperasi_ref: KOPERASI_PANGAN_REF },
    update: {
      nama_koperasi: "Koperasi Pangan Digital Dago",
      status_registrasi: "DALAM PEMBINAAN",
      bentuk_koperasi: "Koperasi Produsen",
      kategori_usaha: "Pangan lokal",
      nik_koperasi: "3273010001001",
      alamat_lengkap: "Jl. Ir. H. Djuanda No. 99, Dago, Bandung",
      kode_pos: "40135",
      koordinat_dibulatkan: "-6.890449,107.610759",
      modal_awal: "175000000",
      sumber_persetujuan: "Dinas Koperasi",
      tentang_koperasi:
        "Koperasi pemasok pangan lokal untuk simulasi dashboard kelayakan usaha.",
      pola_pengelolaan: "Kemitraan anggota pemasok",
      metode_pengisian: "Seeder hackaton",
      diperbarui_pada: now,
    },
    create: {
      koperasi_ref: KOPERASI_PANGAN_REF,
      nama_koperasi: "Koperasi Pangan Digital Dago",
      status_registrasi: "DALAM PEMBINAAN",
      bentuk_koperasi: "Koperasi Produsen",
      kategori_usaha: "Pangan lokal",
      nik_koperasi: "3273010001001",
      alamat_lengkap: "Jl. Ir. H. Djuanda No. 99, Dago, Bandung",
      kode_pos: "40135",
      koordinat_dibulatkan: "-6.890449,107.610759",
      modal_awal: "175000000",
      sumber_persetujuan: "Dinas Koperasi",
      tentang_koperasi:
        "Koperasi pemasok pangan lokal untuk simulasi dashboard kelayakan usaha.",
      pola_pengelolaan: "Kemitraan anggota pemasok",
      metode_pengisian: "Seeder hackaton",
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_anggota_koperasi.upsert({
    where: { anggota_ref: ANGGOTA_MEMBER_REF },
    update: {
      userId: MEMBER_ID,
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Mochamad Alddy",
      nik: "3173010202920002",
      alamat_lengkap:
        "Jl. Kebon Sirih No. 22, Gambir, Jakarta Pusat",
      kode_wilayah: WILAYAH_JAKARTA,
      jenis_kelamin: "L",
      status_keanggotaan: "AKTIF",
      nomor_kta: "KTA-KMP-0001",
      tanggal_terdaftar: new Date("2026-07-01"),
      status_akun: "DISETUJUI",
      pekerjaan: "Pengelola gerai",
      diperbarui_pada: now,
    },
    create: {
      anggota_ref: ANGGOTA_MEMBER_REF,
      userId: MEMBER_ID,
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Mochamad Alddy",
      nik: "3173010202920002",
      alamat_lengkap:
        "Jl. Kebon Sirih No. 22, Gambir, Jakarta Pusat",
      kode_wilayah: WILAYAH_JAKARTA,
      jenis_kelamin: "L",
      status_keanggotaan: "AKTIF",
      nomor_kta: "KTA-KMP-0001",
      tanggal_terdaftar: new Date("2026-07-01"),
      dibuat_pada: now,
      diperbarui_pada: now,
      file_ktp: "/uploads/dummy/ktp-alddy.jpg",
      file_selfie_ktp: "/uploads/dummy/selfie-alddy.jpg",
      status_akun: "DISETUJUI",
      pekerjaan: "Pengelola gerai",
    },
  });

  await prisma.kopdes_hub_sch_anggota_koperasi.upsert({
    where: { anggota_ref: ANGGOTA_ADMIN_REF },
    update: {
      userId: ADMIN_ID,
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Yosep Rohayadi",
      nik: "3173010101900001",
      alamat_lengkap:
        "Jl. Merdeka Selatan No. 10, Gambir, Jakarta Pusat",
      kode_wilayah: WILAYAH_JAKARTA,
      jenis_kelamin: "L",
      status_keanggotaan: "AKTIF",
      nomor_kta: "KTA-KMP-0002",
      tanggal_terdaftar: new Date("2026-07-01"),
      status_akun: "DISETUJUI",
      pekerjaan: "Pengurus koperasi",
      diperbarui_pada: now,
    },
    create: {
      anggota_ref: ANGGOTA_ADMIN_REF,
      userId: ADMIN_ID,
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Yosep Rohayadi",
      nik: "3173010101900001",
      alamat_lengkap:
        "Jl. Merdeka Selatan No. 10, Gambir, Jakarta Pusat",
      kode_wilayah: WILAYAH_JAKARTA,
      jenis_kelamin: "L",
      status_keanggotaan: "AKTIF",
      nomor_kta: "KTA-KMP-0002",
      tanggal_terdaftar: new Date("2026-07-01"),
      dibuat_pada: now,
      diperbarui_pada: now,
      file_ktp: "/uploads/dummy/ktp-yosep.jpg",
      file_selfie_ktp: "/uploads/dummy/selfie-yosep.jpg",
      status_akun: "DISETUJUI",
      pekerjaan: "Pengurus koperasi",
    },
  });

  await prisma.kopdes_hub_sch_pengurus_koperasi.upsert({
    where: { pengurus_ref: "PGR-KMP-JKT-001" },
    update: {
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Yosep Rohayadi",
      jabatan: "Ketua",
      status: "AKTIF",
      no_hp: "081234567801",
      nik: "3173010101900001",
      jenis_kelamin: "L",
      email: "yosep.rohayadi83@gmail.com",
      alamat: "Gambir, Jakarta Pusat",
      periode_mulai: "2026",
      periode_selesai: new Date("2029-12-31"),
      diperbarui_pada: now,
    },
    create: {
      pengurus_ref: "PGR-KMP-JKT-001",
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Yosep Rohayadi",
      jabatan: "Ketua",
      status: "AKTIF",
      no_hp: "081234567801",
      nik: "3173010101900001",
      jenis_kelamin: "L",
      email: "yosep.rohayadi83@gmail.com",
      alamat: "Gambir, Jakarta Pusat",
      periode_mulai: "2026",
      periode_selesai: new Date("2029-12-31"),
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_karyawan_koperasi.upsert({
    where: { karyawan_ref: "KRY-KMP-JKT-001" },
    update: {
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Mochamad Alddy",
      jabatan: "Operator Gerai",
      nomor_hp_karyawan: "081234567802",
      jenis_kelamin: "L",
      nik: "3173010202920002",
      email: "alddy1933@gmail.com",
      status_karyawan: "AKTIF",
      diperbarui_pada: now,
    },
    create: {
      karyawan_ref: "KRY-KMP-JKT-001",
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      nama: "Mochamad Alddy",
      jabatan: "Operator Gerai",
      nomor_hp_karyawan: "081234567802",
      jenis_kelamin: "L",
      nik: "3173010202920002",
      email: "alddy1933@gmail.com",
      status_karyawan: "AKTIF",
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_rat_koperasi.upsert({
    where: { rat_sample_id: "RAT-KMP-JKT-2026" },
    update: {
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      jenis_sektor_koperasi: "Konsumen",
      urutan_rat: "RAT-001",
      tahun_buku: 2026,
      tahun_rencana_kerja: 2027,
      tahun_rencana_anggaran: 2027,
      tanggal_rat: new Date("2026-07-10"),
      jumlah_peserta_rat: 42,
      status_rat: "TERJADWAL",
      tahap_rat: "Persiapan",
      laporan_posisi_keuangan: "/uploads/dummy/laporan-posisi-keuangan.pdf",
      laporan_hasil_usaha: "/uploads/dummy/laporan-hasil-usaha.pdf",
      rapb_posisi_keuangan: "/uploads/dummy/rapb-posisi-keuangan.pdf",
      rapb_hasil_usaha: "/uploads/dummy/rapb-hasil-usaha.pdf",
      diperbarui_pada: now,
    },
    create: {
      rat_sample_id: "RAT-KMP-JKT-2026",
      koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
      jenis_sektor_koperasi: "Konsumen",
      urutan_rat: "RAT-001",
      tahun_buku: 2026,
      tahun_rencana_kerja: 2027,
      tahun_rencana_anggaran: 2027,
      tanggal_rat: new Date("2026-07-10"),
      jumlah_peserta_rat: 42,
      status_rat: "TERJADWAL",
      tahap_rat: "Persiapan",
      laporan_posisi_keuangan: "/uploads/dummy/laporan-posisi-keuangan.pdf",
      laporan_hasil_usaha: "/uploads/dummy/laporan-hasil-usaha.pdf",
      rapb_posisi_keuangan: "/uploads/dummy/rapb-posisi-keuangan.pdf",
      rapb_hasil_usaha: "/uploads/dummy/rapb-hasil-usaha.pdf",
      dibuat_pada: now,
      diperbarui_pada: now,
    },
  });

  await prisma.kopdes_hub_sch_simpanan_anggota.createMany({
    data: [
      {
        simpanan_ref: "SMP-KMP-JKT-0001",
        koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
        anggota_ref: ANGGOTA_MEMBER_REF,
        periode_pembayaran: "2026-07",
        jumlah_simpanan: 150000,
        status: "LUNAS",
        dibuat_pada: now,
        dibayar_pada: new Date("2026-07-05"),
      },
      {
        simpanan_ref: "SMP-KMP-JKT-0002",
        koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
        anggota_ref: ANGGOTA_ADMIN_REF,
        periode_pembayaran: "2026-07",
        jumlah_simpanan: 250000,
        status: "LUNAS",
        dibuat_pada: now,
        dibayar_pada: new Date("2026-07-04"),
      },
    ],
    skipDuplicates: true,
  });

  await prisma.kopdes_hub_sch_transaksi_penjualan.createMany({
    data: [
      {
        transaksi_sample_id: "TRX-KMP-JKT-0001",
        koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
        nama_pelanggan: "Warung Sumber Rezeki",
        tanggal_dibuat: new Date("2026-01-15"),
        total_pembayaran: 1850000,
        status_transaksi: "Paid",
        metode_pembayaran: "QRIS",
        dibuat_pada: now,
        diperbarui_pada: new Date("2026-01-15"),
      },
      {
        transaksi_sample_id: "TRX-KMP-JKT-0002",
        koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
        nama_pelanggan: "Ibu Sari",
        tanggal_dibuat: new Date("2026-02-18"),
        total_pembayaran: 925000,
        status_transaksi: "Paid",
        metode_pembayaran: "Tunai",
        dibuat_pada: now,
        diperbarui_pada: new Date("2026-02-18"),
      },
      {
        transaksi_sample_id: "TRX-KMP-JKT-0003",
        koperasi_ref: KOPERASI_MERAH_PUTIH_REF,
        nama_pelanggan: "Bapak Rudi",
        tanggal_dibuat: new Date("2026-07-08"),
        total_pembayaran: 1325000,
        status_transaksi: "Pending",
        metode_pembayaran: "Transfer",
        dibuat_pada: now,
        diperbarui_pada: new Date("2026-07-08"),
      },
      {
        transaksi_sample_id: "TRX-KMP-BDG-0001",
        koperasi_ref: KOPERASI_PANGAN_REF,
        nama_pelanggan: "Pasar Dago Segar",
        tanggal_dibuat: new Date("2026-03-20"),
        total_pembayaran: 2750000,
        status_transaksi: "Paid",
        metode_pembayaran: "Transfer",
        dibuat_pada: now,
        diperbarui_pada: new Date("2026-03-20"),
      },
    ],
    skipDuplicates: true,
  });

  const projectPlatform = await prisma.project.upsert({
    where: { code: "KDH-2026-001" },
    update: {
      name: "SIMPUL Merah Putih - Platform KOPDESHUB",
      description:
        "Pengembangan backend hackaton untuk autentikasi, anggota koperasi, simpanan, RAT, dan transaksi penjualan.",
      status: "ACTIVE",
      contractStatus: "CONTRACTED",
      category: "PRODUCT",
      year: 2026,
      contractValue: 500000000,
      contractStart: new Date("2026-07-01"),
      contractEnd: new Date("2026-08-31"),
      ownerId: ADMIN_ID,
    },
    create: {
      code: "KDH-2026-001",
      name: "SIMPUL Merah Putih - Platform KOPDESHUB",
      description:
        "Pengembangan backend hackaton untuk autentikasi, anggota koperasi, simpanan, RAT, dan transaksi penjualan.",
      status: "ACTIVE",
      contractStatus: "CONTRACTED",
      category: "PRODUCT",
      year: 2026,
      contractValue: 500000000,
      contractStart: new Date("2026-07-01"),
      contractEnd: new Date("2026-08-31"),
      ownerId: ADMIN_ID,
      createdBy: SUPERADMIN_ID,
    },
  });

  const projectAnalytics = await prisma.project.upsert({
    where: { code: "KDH-2026-002" },
    update: {
      name: "Dashboard Kelayakan dan Monitoring Koperasi",
      description:
        "Visualisasi lokasi koperasi, tren penjualan, arus kas, NPV, dan performa operasional.",
      status: "ACTIVE",
      contractStatus: "POTENTIAL",
      category: "PROJECT",
      year: 2026,
      ownerId: ADMIN_ID,
    },
    create: {
      code: "KDH-2026-002",
      name: "Dashboard Kelayakan dan Monitoring Koperasi",
      description:
        "Visualisasi lokasi koperasi, tren penjualan, arus kas, NPV, dan performa operasional.",
      status: "ACTIVE",
      contractStatus: "POTENTIAL",
      category: "PROJECT",
      year: 2026,
      ownerId: ADMIN_ID,
      createdBy: SUPERADMIN_ID,
    },
  });

  const assignments = await Promise.all([
    prisma.assignment.create({
      data: {
        projectId: projectPlatform.id,
        assignedById: ADMIN_ID,
        assignedToId: MEMBER_ID,
        title: "Integrasi CRUD profil dan anggota koperasi",
        description:
          "Pastikan endpoint profil koperasi dan anggota memakai relasi referensi wilayah yang benar.",
        startDatetime: new Date(now.getTime() - day),
        endDatetime: new Date(now.getTime() + 2 * day),
        status: "IN_PROGRESS",
        createdBy: ADMIN_ID,
      },
    }),
    prisma.assignment.create({
      data: {
        projectId: projectPlatform.id,
        assignedById: ADMIN_ID,
        assignedToId: MEMBER_ID,
        title: "Seed data transaksi untuk demo NPV",
        description:
          "Siapkan data penjualan berstatus Paid agar endpoint tren penjualan dan NPV punya isi.",
        startDatetime: new Date(now.getTime() - 3 * day),
        endDatetime: new Date(now.getTime() - day),
        status: "COMPLETED",
        completedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
        createdBy: ADMIN_ID,
      },
    }),
    prisma.assignment.create({
      data: {
        projectId: projectAnalytics.id,
        assignedById: ADMIN_ID,
        assignedToId: MEMBER_ID,
        title: "Validasi radius lokasi koperasi",
        description:
          "Uji pencarian koperasi terdekat berdasarkan koordinat pengguna.",
        startDatetime: new Date(now.getTime() - 5 * day),
        endDatetime: new Date(now.getTime() - 2 * day),
        status: "PENDING",
        createdBy: ADMIN_ID,
      },
    }),
  ]);

  await prisma.assignmentLog.createMany({
    data: [
      {
        assignmentId: assignments[0].id,
        changedById: MEMBER_ID,
        oldStatus: "PENDING",
        newStatus: "IN_PROGRESS",
        note: "Mulai integrasi endpoint koperasi.",
        changedAt: new Date(now.getTime() - 12 * 60 * 60 * 1000),
      },
      {
        assignmentId: assignments[1].id,
        changedById: MEMBER_ID,
        oldStatus: "IN_PROGRESS",
        newStatus: "COMPLETED",
        note: "Data penjualan demo sudah tersedia.",
        changedAt: new Date(now.getTime() - 26 * 60 * 60 * 1000),
      },
    ],
  });

  await prisma.activity.createMany({
    data: [
      {
        userId: MEMBER_ID,
        projectId: projectPlatform.id,
        assignedById: ADMIN_ID,
        title: "Review schema Prisma koperasi",
        description:
          "Cek ulang relasi anggota, simpanan, dan transaksi penjualan.",
        startDatetime: new Date(now.getTime() - 6 * 60 * 60 * 1000),
        endDatetime: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        status: "COMPLETED",
        completedAt: new Date(now.getTime() - 4 * 60 * 60 * 1000),
        createdBy: ADMIN_ID,
      },
      {
        userId: MEMBER_ID,
        projectId: projectAnalytics.id,
        assignedById: ADMIN_ID,
        title: "Uji endpoint tren penjualan",
        description:
          "Pastikan agregasi bulanan mengembalikan data untuk koperasi demo.",
        startDatetime: new Date(now.getTime() + 2 * 60 * 60 * 1000),
        endDatetime: new Date(now.getTime() + 5 * 60 * 60 * 1000),
        status: "PENDING",
        createdBy: ADMIN_ID,
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: MEMBER_ID,
        title: "Tugas Hackaton Baru",
        message:
          "Anda ditugaskan pada integrasi CRUD profil dan anggota koperasi.",
        link: "/my-tasks",
        isRead: false,
        createdAt: new Date(now.getTime() - 23 * 60 * 60 * 1000),
      },
      {
        userId: MEMBER_ID,
        title: "Validasi Lokasi Koperasi",
        message:
          "Tugas validasi radius lokasi koperasi sudah melewati batas waktu.",
        link: "/my-tasks",
        isRead: false,
        createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000),
      },
      {
        userId: ADMIN_ID,
        title: "Seed Demo Siap",
        message:
          "Data demo KOPDESHUB untuk profil, anggota, simpanan, dan transaksi sudah tersedia.",
        link: "/dashboard",
        isRead: false,
        createdAt: new Date(now.getTime() - 60 * 60 * 1000),
      },
    ],
  });

  console.log("Dummy data KOPDESHUB hackaton seeded.");
}
