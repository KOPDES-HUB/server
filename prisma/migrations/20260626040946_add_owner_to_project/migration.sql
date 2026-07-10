-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "owner_id" TEXT;

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth_users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
