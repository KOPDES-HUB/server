/*
  Warnings:

  - A unique constraint covering the columns `[ref_anggota]` on the table `auth_users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "auth_users" ADD COLUMN     "no_wa" VARCHAR(20),
ADD COLUMN     "ref_anggota" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_ref_anggota_key" ON "auth_users"("ref_anggota");

-- AddForeignKey
ALTER TABLE "auth_users" ADD CONSTRAINT "auth_users_ref_anggota_fkey" FOREIGN KEY ("ref_anggota") REFERENCES "kopdes_hub_sch_anggota_koperasi"("anggota_ref") ON DELETE SET NULL ON UPDATE CASCADE;
