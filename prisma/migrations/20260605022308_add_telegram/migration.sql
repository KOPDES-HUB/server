-- AlterTable
ALTER TABLE "auth_users" ADD COLUMN     "telegram_chat_id" VARCHAR(100),
ADD COLUMN     "telegram_username" VARCHAR(100);
