-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('POTENTIAL', 'NOT_CONTRACTED', 'CONTRACTED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "contract_end" TIMESTAMP(3),
ADD COLUMN     "contract_start" TIMESTAMP(3),
ADD COLUMN     "contract_status" "ContractStatus" NOT NULL DEFAULT 'POTENTIAL',
ADD COLUMN     "contract_value" DOUBLE PRECISION,
ADD COLUMN     "year" INTEGER;
