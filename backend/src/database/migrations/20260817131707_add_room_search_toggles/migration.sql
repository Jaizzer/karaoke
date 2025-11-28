-- AlterTable
ALTER TABLE "room" ADD COLUMN     "aiSearchEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "appendKaraoke" BOOLEAN NOT NULL DEFAULT true;
