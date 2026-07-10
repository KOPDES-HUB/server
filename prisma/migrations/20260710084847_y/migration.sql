-- CreateTable
CREATE TABLE "kopdes_hub_sch_anggota_koperasi" (
    "anggota_ref" TEXT NOT NULL,
    "koperasi_ref" TEXT NOT NULL,
    "nama" TEXT,
    "nik" TEXT,
    "kode_wilayah" TEXT,
    "jenis_kelamin" TEXT,
    "status_keanggotaan" TEXT,
    "tanggal_terdaftar" DATE,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6),
    "file_ktp" TEXT,
    "status_akun" TEXT,
    "pekerjaan" TEXT,

    CONSTRAINT "kopdes_hub_sch_anggota_koperasi_pkey" PRIMARY KEY ("anggota_ref")
);

-- CreateTable
CREATE TABLE "kopdes_hub_sch_karyawan_koperasi" (
    "karyawan_ref" TEXT NOT NULL,
    "koperasi_ref" TEXT NOT NULL,
    "nama" TEXT,
    "jabatan" TEXT,
    "nomor_hp_karyawan" TEXT,
    "jenis_kelamin" TEXT,
    "nik" TEXT,
    "email" TEXT,
    "status_karyawan" TEXT,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6),

    CONSTRAINT "kopdes_hub_sch_karyawan_koperasi_pk" PRIMARY KEY ("karyawan_ref")
);

-- CreateTable
CREATE TABLE "kopdes_hub_sch_pengurus_koperasi" (
    "pengurus_ref" TEXT NOT NULL,
    "koperasi_ref" TEXT NOT NULL,
    "nama" TEXT,
    "jabatan" TEXT,
    "status" TEXT,
    "no_hp" TEXT,
    "nik" TEXT,
    "jenis_kelamin" TEXT,
    "foto_profil" TEXT,
    "email" TEXT,
    "alamat" TEXT,
    "kode_pos" TEXT,
    "tanggal_lahir" TEXT,
    "status_pendidikan" TEXT,
    "periode_mulai" TEXT,
    "periode_selesai" DATE,
    "file_ktp" TEXT,
    "sumber_data" TEXT,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6),

    CONSTRAINT "kopdes_hub_sch_pengurus_koperasi_pk" PRIMARY KEY ("pengurus_ref")
);

-- CreateTable
CREATE TABLE "kopdes_hub_sch_rat_koperasi" (
    "rat_sample_id" TEXT NOT NULL,
    "koperasi_ref" TEXT NOT NULL,
    "jenis_sektor_koperasi" TEXT,
    "urutan_rat" TEXT,
    "tahun_buku" SMALLINT,
    "tahun_rencana_kerja" SMALLINT,
    "tahun_rencana_anggaran" SMALLINT,
    "tanggal_rat" DATE,
    "jumlah_peserta_rat" INTEGER,
    "status_rat" TEXT,
    "tahap_rat" TEXT,
    "laporan_posisi_keuangan" TEXT,
    "laporan_hasil_usaha" TEXT,
    "rapb_posisi_keuangan" TEXT,
    "rapb_hasil_usaha" TEXT,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6),

    CONSTRAINT "kopdes_hub_sch_rat_koperasi_pk" PRIMARY KEY ("rat_sample_id")
);

-- CreateTable
CREATE TABLE "kopdes_hub_sch_referensi_koperasi_wilayah" (
    "koperasi_ref" TEXT NOT NULL,
    "kode_wilayah" TEXT,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6),

    CONSTRAINT "kopdes_hub_sch_referensi_koperasi_wilayah_pkey" PRIMARY KEY ("koperasi_ref")
);

-- CreateTable
CREATE TABLE "kopdes_hub_sch_referensi_wilayah" (
    "provinsi" TEXT,
    "kab_kota" TEXT,
    "kecamatan" TEXT,
    "desa_kelurahan" TEXT,
    "kode_wilayah" TEXT NOT NULL,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6),

    CONSTRAINT "kopdes_hub_sch_referensi_wilayah_pkey" PRIMARY KEY ("kode_wilayah")
);

-- CreateTable
CREATE TABLE "kopdes_hub_sch_simpanan_anggota" (
    "simpanan_ref" TEXT NOT NULL,
    "koperasi_ref" TEXT NOT NULL,
    "anggota_ref" TEXT NOT NULL,
    "periode_pembayaran" TEXT,
    "jumlah_simpanan" DECIMAL,
    "status" TEXT,
    "dibuat_pada" TIMESTAMP(6),
    "dibayar_pada" TIMESTAMP(6)
);

-- CreateIndex
CREATE UNIQUE INDEX "kopdes_hub_sch_anggota_koperasi_unique" ON "kopdes_hub_sch_anggota_koperasi"("anggota_ref");

-- CreateIndex
CREATE UNIQUE INDEX "kopdes_hub_sch_simpanan_anggota_unique" ON "kopdes_hub_sch_simpanan_anggota"("simpanan_ref");

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_anggota_koperasi" ADD CONSTRAINT "fk_anggota_koperasi_kode_wilayah_96a41cef" FOREIGN KEY ("kode_wilayah") REFERENCES "kopdes_hub_sch_referensi_wilayah"("kode_wilayah") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_anggota_koperasi" ADD CONSTRAINT "fk_anggota_koperasi_koperasi_ref_b8176ae0" FOREIGN KEY ("koperasi_ref") REFERENCES "kopdes_hub_sch_referensi_koperasi_wilayah"("koperasi_ref") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_karyawan_koperasi" ADD CONSTRAINT "fk_karyawan_koperasi_koperasi_ref_4e47588f" FOREIGN KEY ("koperasi_ref") REFERENCES "kopdes_hub_sch_referensi_koperasi_wilayah"("koperasi_ref") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_pengurus_koperasi" ADD CONSTRAINT "fk_pengurus_koperasi_koperasi_ref_762eb9ec" FOREIGN KEY ("koperasi_ref") REFERENCES "kopdes_hub_sch_referensi_koperasi_wilayah"("koperasi_ref") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_rat_koperasi" ADD CONSTRAINT "fk_rat_koperasi_koperasi_ref_7258ec7e" FOREIGN KEY ("koperasi_ref") REFERENCES "kopdes_hub_sch_referensi_koperasi_wilayah"("koperasi_ref") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_simpanan_anggota" ADD CONSTRAINT "fk_simpanan_anggota_anggota_koperasi" FOREIGN KEY ("anggota_ref") REFERENCES "kopdes_hub_sch_anggota_koperasi"("anggota_ref") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_simpanan_anggota" ADD CONSTRAINT "fk_simpanan_anggota_koperasi_ref_c7fd2f70" FOREIGN KEY ("koperasi_ref") REFERENCES "kopdes_hub_sch_referensi_koperasi_wilayah"("koperasi_ref") ON DELETE NO ACTION ON UPDATE NO ACTION;
