import { prisma } from '../../../database/prismaClient.ts';

// PLAYED/REMOVED items are excluded on purpose; neither the host dashboard nor the member queue view needs history.
export async function listQueueItems(roomId: string) {
	return prisma.queueItem.findMany({
		where: { roomId, status: { in: ['QUEUED', 'PLAYING'] } },
		orderBy: { position: 'asc' },
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
	// New items go to the back: one more than the current highest position, including PLAYED/REMOVED rows.
	const highest = await prisma.queueItem.aggregate({
		where: { roomId },
		_max: { position: true },
	});
	const position = (highest._max.position ?? 0) + 1;

	return prisma.queueItem.create({
		data: { roomId, addedById, position, ...data },
	});
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

// Swaps this item's position with its immediate QUEUED neighbor; no-op at either end, and PLAYING is left alone.
export async function moveQueueItem(id: string, direction: 'up' | 'down') {
	const item = await prisma.queueItem.findUnique({ where: { id } });
	if (item?.status !== 'QUEUED') {
		return null;
	}

	const neighbor = await prisma.queueItem.findFirst({
		where: {
			roomId: item.roomId,
			status: 'QUEUED',
			position:
				direction === 'up'
					? { lt: item.position }
					: { gt: item.position },
		},
		orderBy: { position: direction === 'up' ? 'desc' : 'asc' },
	});
	if (!neighbor) {
		return null;
	}

	await prisma.$transaction([
		prisma.queueItem.update({
			where: { id: item.id },
			data: { position: neighbor.position },
		}),
		prisma.queueItem.update({
			where: { id: neighbor.id },
			data: { position: item.position },
		}),
	]);

	return prisma.queueItem.findUnique({ where: { id } });
}
