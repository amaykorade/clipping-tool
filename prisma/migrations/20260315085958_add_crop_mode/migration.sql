-- CreateEnum
CREATE TYPE "CropMode" AS ENUM ('FILL', 'FIT');

-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "cropMode" "CropMode" NOT NULL DEFAULT 'FILL';
