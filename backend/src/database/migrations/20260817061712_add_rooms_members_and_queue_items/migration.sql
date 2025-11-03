-- CreateEnum
CREATE TYPE "RoomStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "QueueItemStatus" AS ENUM ('QUEUED', 'PLAYING', 'PLAYED', 'REMOVED');

-- CreateTable
CREATE TABLE "room" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT,
    "hostId" TEXT NOT NULL,
    "autoSelect" BOOLEAN NOT NULL DEFAULT false,
    "status" "RoomStatus" NOT NULL DEFAULT 'OPEN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "room_member" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "room_member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "queue_item" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "addedById" TEXT NOT NULL,
    "youtubeVideoId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "channelTitle" TEXT NOT NULL,
    "thumbnailUrl" TEXT NOT NULL,
    "status" "QueueItemStatus" NOT NULL DEFAULT 'QUEUED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "endedAt" TIMESTAMP(3),

    CONSTRAINT "queue_item_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "room_code_key" ON "room"("code");

-- CreateIndex
CREATE INDEX "room_hostId_idx" ON "room"("hostId");

-- CreateIndex
CREATE UNIQUE INDEX "room_member_sessionToken_key" ON "room_member"("sessionToken");

-- CreateIndex
CREATE INDEX "room_member_roomId_idx" ON "room_member"("roomId");

-- CreateIndex
CREATE INDEX "queue_item_roomId_idx" ON "queue_item"("roomId");

-- CreateIndex
CREATE INDEX "queue_item_addedById_idx" ON "queue_item"("addedById");

-- AddForeignKey
ALTER TABLE "room" ADD CONSTRAINT "room_hostId_fkey" FOREIGN KEY ("hostId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "room_member" ADD CONSTRAINT "room_member_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_roomId_fkey" FOREIGN KEY ("roomId") REFERENCES "room"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "queue_item" ADD CONSTRAINT "queue_item_addedById_fkey" FOREIGN KEY ("addedById") REFERENCES "room_member"("id") ON DELETE CASCADE ON UPDATE CASCADE;
