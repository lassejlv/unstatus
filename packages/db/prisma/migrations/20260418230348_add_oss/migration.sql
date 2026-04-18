-- CreateTable
CREATE TABLE "oss_application" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "githubRepo" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "website" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "reviewedAt" TIMESTAMP(3),
    "reviewerId" TEXT,
    "reviewNotes" TEXT,
    "discountId" TEXT,
    "discountCode" TEXT,
    "discountExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "oss_application_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "oss_application_organizationId_idx" ON "oss_application"("organizationId");

-- CreateIndex
CREATE INDEX "oss_application_userId_idx" ON "oss_application"("userId");

-- CreateIndex
CREATE INDEX "oss_application_status_idx" ON "oss_application"("status");

-- AddForeignKey
ALTER TABLE "oss_application" ADD CONSTRAINT "oss_application_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oss_application" ADD CONSTRAINT "oss_application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "oss_application" ADD CONSTRAINT "oss_application_reviewerId_fkey" FOREIGN KEY ("reviewerId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
