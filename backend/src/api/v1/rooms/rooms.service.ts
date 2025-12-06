import { randomInt } from 'node:crypto';
import { prisma } from '../../../database/prismaClient.ts';
import { joinRoom } from '../room-members/room-members.service.ts';

// Excludes lookalike characters (0/O, 1/I/L) since guests may type this in by hand.
const CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;

function generateCode(): string {
	let code = '';
	for (let i = 0; i < CODE_LENGTH; i++) {
		// .charAt() always returns string, not string | undefined, unlike bracket indexing.
		code += CODE_ALPHABET.charAt(randomInt(CODE_ALPHABET.length));
	}
	return code;
}

// 32^6 codes makes collisions astronomically unlikely; this loop is just insurance.
async function generateUniqueCode(): Promise<string> {
	for (let attempt = 0; attempt < 5; attempt++) {
		const code = generateCode();
		const existing = await prisma.room.findUnique({ where: { code } });
		if (!existing) {
			return code;
		}
	}
	throw new Error('Failed to generate a unique room code after 5 attempts.');
}

// A host runs one room at a time (rooms.handler.ts enforces this), so there's no ambiguity here.
export async function findOpenRoomByHost(hostId: string) {
	return prisma.room.findFirst({ where: { hostId, status: 'OPEN' } });
}

// Also creates a host RoomMember row, so a host-added queue item reuses the same addedById as a guest's.
export async function createRoom(
	hostId: string,
	hostName: string,
	name?: string,
) {
	const code = await generateUniqueCode();
	// exactOptionalPropertyTypes needs the key absent, not undefined, so name is only spread in when given.
	const room = await prisma.room.create({
		data: { code, hostId, ...(name !== undefined && { name }) },
	});
	await joinRoom(room.id, hostName, true);
	return room;
}

// Most recent claim wins; callers must already have verified the caller is this room's host.
export async function claimHost(id: string, sessionId: string) {
	return prisma.room.update({
		where: { id },
		data: { activeHostSessionId: sessionId },
	});
}

export async function updateRoom(
	id: string,
	data: {
		name?: string | undefined;
		aiSearchEnabled?: boolean | undefined;
		appendKaraoke?: boolean | undefined;
		status?: 'OPEN' | 'CLOSED' | undefined;
	},
) {
	// Same reasoning as createRoom above: only pass through fields the caller actually set.
	return prisma.room.update({
		where: { id },
		data: {
			...(data.name !== undefined && { name: data.name }),
			...(data.aiSearchEnabled !== undefined && {
				aiSearchEnabled: data.aiSearchEnabled,
			}),
			...(data.appendKaraoke !== undefined && {
				appendKaraoke: data.appendKaraoke,
			}),
			...(data.status !== undefined && { status: data.status }),
		},
	});
}
