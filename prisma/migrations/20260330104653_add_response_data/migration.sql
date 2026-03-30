-- AlterTable
ALTER TABLE "monitor_check" ADD COLUMN     "responseBody" TEXT,
ADD COLUMN     "responseHeaders" JSONB;
