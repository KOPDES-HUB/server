-- CreateTable
CREATE TABLE "profil_koperasi" (
    "koperasi_ref" TEXT NOT NULL,
    "nama_koperasi" TEXT,
    "status_registrasi" TEXT,
    "bentuk_koperasi" TEXT,
    "kategori_usaha" TEXT,
    "nik_koperasi" TEXT,
    "alamat_lengkap" TEXT,
    "kode_pos" TEXT,
    "koordinat_dibulatkan" TEXT,
    "modal_awal" TEXT,
    "sumber_persetujuan" TEXT,
    "tentang_koperasi" TEXT,
    "pola_pengelolaan" TEXT,
    "metode_pengisian" TEXT,
    "dibuat_pada" TIMESTAMP(6),
    "diperbarui_pada" TIMESTAMP(6)
);

-- CreateIndex
CREATE UNIQUE INDEX "kopdes_hub_sch_profil_koperasi_pk" ON "profil_koperasi"("koperasi_ref");
