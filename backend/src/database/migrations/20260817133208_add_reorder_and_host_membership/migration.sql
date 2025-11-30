-- AlterTable
ALTER TABLE "room" DROP COLUMN "autoSelect";

-- AlterTable
ALTER TABLE "room_member" ADD COLUMN     "isHost" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: position has no schema-level default (queue.service.ts
-- always sets it explicitly on insert) — existing rows are backfilled by
-- creation order within their room before the column is made required.
ALTER TABLE "queue_item" ADD COLUMN     "position" INTEGER;

UPDATE "queue_item" AS q
SET "position" = sub.rn
FROM (
	SELECT "id", ROW_NUMBER() OVER (PARTITION BY "roomId" ORDER BY "createdAt" ASC) AS rn
	FROM "queue_item"
) AS sub
WHERE q."id" = sub."id";

ALTER TABLE "queue_item" ALTER COLUMN "position" SET NOT NULL;
