/*
  Warnings:

  - You are about to drop the column `ref_anggota` on the `auth_users` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[user_id]` on the table `kopdes_hub_sch_anggota_koperasi` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[nomor_kta]` on the table `kopdes_hub_sch_anggota_koperasi` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "auth_users" DROP CONSTRAINT "auth_users_ref_anggota_fkey";

-- DropIndex
DROP INDEX "auth_users_ref_anggota_key";

-- AlterTable
ALTER TABLE "auth_users" DROP COLUMN "ref_anggota",
ADD COLUMN     "alamat_lengkap" TEXT,
ADD COLUMN     "file_ktp" TEXT,
ADD COLUMN     "file_selfie_ktp" TEXT,
ADD COLUMN     "koperasi_ref" TEXT;

-- AlterTable
ALTER TABLE "kopdes_hub_sch_anggota_koperasi" ADD COLUMN     "alamat_lengkap" TEXT,
ADD COLUMN     "file_selfie_ktp" TEXT,
ADD COLUMN     "nomor_kta" VARCHAR(30),
ADD COLUMN     "user_id" TEXT,
ALTER COLUMN "status_keanggotaan" SET DEFAULT 'AKTIF';

-- CreateIndex
CREATE UNIQUE INDEX "kopdes_hub_sch_anggota_koperasi_user_id_key" ON "kopdes_hub_sch_anggota_koperasi"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "kopdes_hub_sch_anggota_koperasi_nomor_kta_key" ON "kopdes_hub_sch_anggota_koperasi"("nomor_kta");

-- AddForeignKey
ALTER TABLE "kopdes_hub_sch_anggota_koperasi" ADD CONSTRAINT "kopdes_hub_sch_anggota_koperasi_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
