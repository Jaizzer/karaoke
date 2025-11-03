import { prisma } from '../database/prismaClient.ts';

// Standalone service, rather than inlining this query, so the users route and auth middleware share the same lookup.
export default async function getUserById(id: string) {
	return prisma.user.findUnique({ where: { id } });
}
