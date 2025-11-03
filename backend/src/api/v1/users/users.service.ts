import { prisma } from '../../../database/prismaClient.ts';
import getUserById from '../../../services/getUserById.ts';

export async function getOwnProfile(id: string) {
	return getUserById(id);
}

export async function updateUserName(id: string, name: string) {
	return prisma.user.update({ where: { id }, data: { name } });
}
