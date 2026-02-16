-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'STARTER', 'PRO');

-- AlterTable
ALTER TABLE "User" ADD COLUMN "plan" "Plan" NOT NULL DEFAULT 'FREE',
ADD COLUMN "razorpayCustomerId" TEXT,
ADD COLUMN "razorpaySubscriptionId" TEXT,
ADD COLUMN "subscriptionCurrentPeriodEnd" TIMESTAMP(3),
ADD COLUMN "clipDownloadsUsedThisMonth" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "clipDownloadsPeriodStart" TIMESTAMP(3);
