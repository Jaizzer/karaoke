import { randomInt } from 'node:crypto';
import { prisma } from '../../../database/prismaClient.ts';
import getRoomByCode from '../../../services/getRoomByCode.ts';

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

export async function createRoom(hostId: string, name?: string) {
	const code = await generateUniqueCode();
	// exactOptionalPropertyTypes needs the key absent, not undefined, so name is only spread in when given.
	return prisma.room.create({
		data: { code, hostId, ...(name !== undefined && { name }) },
	});
}

export { getRoomByCode };

export async function updateRoom(
	id: string,
	data: {
		name?: string | undefined;
		autoSelect?: boolean | undefined;
		status?: 'OPEN' | 'CLOSED' | undefined;
	},
) {
	// Same reasoning as createRoom above: only pass through fields the caller actually set.
	return prisma.room.update({
		where: { id },
		data: {
			...(data.name !== undefined && { name: data.name }),
			...(data.autoSelect !== undefined && {
				autoSelect: data.autoSelect,
			}),
			...(data.status !== undefined && { status: data.status }),
		},
	});
}
