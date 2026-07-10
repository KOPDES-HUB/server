-- AlterTable
ALTER TABLE "auth_users" ADD COLUMN     "notify_email" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "notify_telegram" BOOLEAN NOT NULL DEFAULT false;
