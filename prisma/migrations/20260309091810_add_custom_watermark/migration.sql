-- AlterTable
ALTER TABLE "User" ADD COLUMN     "watermarkKey" TEXT,
ADD COLUMN     "watermarkOpacity" DOUBLE PRECISION DEFAULT 0.6,
ADD COLUMN     "watermarkPosition" TEXT DEFAULT 'bottom-right';
