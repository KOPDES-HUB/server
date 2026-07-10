-- CreateEnum
CREATE TYPE "ProjectCategory" AS ENUM ('PROJECT', 'PRODUCT', 'OTHERS');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "category" "ProjectCategory" NOT NULL DEFAULT 'PROJECT';
