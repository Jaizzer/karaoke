import { prisma } from '../database/prismaClient.ts';
import type { RoomModel } from '../database/generated/models/Room.ts';

const STALE_AFTER_MS = 24 * 60 * 60 * 1000;

// A room a host forgets to close shouldn't stay OPEN forever; rather than a scheduled job, this lazily closes
// an OPEN room the first time anything reads it more than 24h after creation.
export default async function closeStaleRoom(
	room: RoomModel,
): Promise<RoomModel> {
	if (room.status !== 'OPEN') {
		return room;
	}
	if (Date.now() - room.createdAt.getTime() < STALE_AFTER_MS) {
		return room;
	}
	return prisma.room.update({
		where: { id: room.id },
		data: { status: 'CLOSED' },
	});
}
