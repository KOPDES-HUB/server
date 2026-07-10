-- AlterTable
ALTER TABLE "auth_users" ADD COLUMN "nik" VARCHAR(16);

-- CreateIndex
CREATE UNIQUE INDEX "auth_users_nik_key" ON "auth_users"("nik");