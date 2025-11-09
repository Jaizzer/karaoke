import { prisma } from '../database/prismaClient.ts';

// Shared across every room-scoped domain, same reasoning as getUserById.ts sharing one lookup.
export default async function getRoomByCode(code: string) {
	return prisma.room.findUnique({ where: { code } });
}
