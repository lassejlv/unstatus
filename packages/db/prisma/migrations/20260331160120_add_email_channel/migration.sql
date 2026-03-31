-- AlterTable
ALTER TABLE "notification_channel" ADD COLUMN     "recipientEmail" TEXT,
ALTER COLUMN "webhookUrl" DROP NOT NULL;
