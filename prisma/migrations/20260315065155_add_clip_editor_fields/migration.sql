-- AlterTable
ALTER TABLE "Clip" ADD COLUMN     "captionEdits" JSONB,
ADD COLUMN     "editedEndTime" DOUBLE PRECISION,
ADD COLUMN     "editedStartTime" DOUBLE PRECISION;
