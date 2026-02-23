-- AlterTable
ALTER TABLE "User" ADD COLUMN "nextRazorpaySubscriptionId" TEXT;
ALTER TABLE "User" ADD COLUMN "nextPlan" TEXT;
ALTER TABLE "User" ADD COLUMN "nextBillingInterval" TEXT;
ALTER TABLE "User" ADD COLUMN "nextSubscriptionPeriodEnd" TIMESTAMP(3);
