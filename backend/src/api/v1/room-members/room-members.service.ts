import { randomBytes } from 'node:crypto';
import { prisma } from '../../../database/prismaClient.ts';

// A bearer token, unguessable not memorable, so it's a long random hex string instead of rooms.service.ts's short alphabet.
function generateSessionToken(): string {
	return randomBytes(32).toString('hex');
}

export async function joinRoom(
	roomId: string,
	displayName: string,
	isHost = false,
) {
	const sessionToken = generateSessionToken();
	return prisma.roomMember.create({
		data: { roomId, displayName, sessionToken, isHost },
	});
}

// The membership row createRoom creates for the room's own host, used to attribute host-added queue items via addedById.
export async function getHostMember(roomId: string) {
	return prisma.roomMember.findFirst({ where: { roomId, isHost: true } });
}
