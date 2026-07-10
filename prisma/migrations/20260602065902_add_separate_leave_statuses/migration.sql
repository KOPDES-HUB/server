-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "finance_status" "LeaveStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "manager_status" "LeaveStatus" NOT NULL DEFAULT 'PENDING';
