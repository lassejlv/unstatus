-- CreateTable
CREATE TABLE "status_page_subscriber" (
    "id" TEXT NOT NULL,
    "statusPageId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "monitorIds" JSONB NOT NULL DEFAULT '[]',
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "status_page_subscriber_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "status_page_subscriber_token_key" ON "status_page_subscriber"("token");

-- CreateIndex
CREATE INDEX "status_page_subscriber_statusPageId_idx" ON "status_page_subscriber"("statusPageId");

-- CreateIndex
CREATE UNIQUE INDEX "status_page_subscriber_statusPageId_email_key" ON "status_page_subscriber"("statusPageId", "email");

-- AddForeignKey
ALTER TABLE "status_page_subscriber" ADD CONSTRAINT "status_page_subscriber_statusPageId_fkey" FOREIGN KEY ("statusPageId") REFERENCES "status_page"("id") ON DELETE CASCADE ON UPDATE CASCADE;
