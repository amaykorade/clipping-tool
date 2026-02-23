-- AlterTable
ALTER TABLE "User" ADD COLUMN "totalVideosUploaded" INTEGER NOT NULL DEFAULT 0;

-- Backfill: set totalVideosUploaded = current video count for existing users
UPDATE "User" u
SET "totalVideosUploaded" = (SELECT COUNT(*)::int FROM "Video" v WHERE v."userId" = u.id);
