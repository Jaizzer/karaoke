import { prisma } from '../../../database/prismaClient.ts';

// PLAYED/REMOVED items are excluded on purpose; neither the host dashboard nor the member queue view needs history.
export async function listQueueItems(roomId: string) {
	return prisma.queueItem.findMany({
		where: { roomId, status: { in: ['QUEUED', 'PLAYING'] } },
		orderBy: { createdAt: 'asc' },
	});
}

export async function addQueueItem(
	roomId: string,
	addedById: string,
	data: {
		youtubeVideoId: string;
		title: string;
		channelTitle: string;
		thumbnailUrl: string;
	},
) {
	return prisma.queueItem.create({ data: { roomId, addedById, ...data } });
}

export async function getQueueItemById(id: string) {
	return prisma.queueItem.findUnique({ where: { id } });
}

// Soft delete: REMOVED is a real status in the enum, not an actual row deletion, in case a history view ever needs it.
export async function removeQueueItem(id: string) {
	return prisma.queueItem.update({
		where: { id },
		data: { status: 'REMOVED' },
	});
}

export async function startQueueItem(id: string) {
	return prisma.queueItem.update({
		where: { id },
		data: { status: 'PLAYING', startedAt: new Date() },
	});
}

export async function finishQueueItem(id: string) {
	return prisma.queueItem.update({
		where: { id },
		data: { status: 'PLAYED', endedAt: new Date() },
	});
}
