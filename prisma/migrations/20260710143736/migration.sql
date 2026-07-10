-- CreateEnum
CREATE TYPE "StatusRegistrasiAkun" AS ENUM ('DIAJUKAN', 'DISETUJUI', 'DITOLAK', 'DITANGGUHKAN');

-- AlterTable
ALTER TABLE "auth_users" ADD COLUMN     "alasan_penolakan" TEXT,
ADD COLUMN     "status_registrasi" "StatusRegistrasiAkun" NOT NULL DEFAULT 'DIAJUKAN';
