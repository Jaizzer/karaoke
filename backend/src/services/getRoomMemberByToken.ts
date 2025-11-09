import { prisma } from '../database/prismaClient.ts';

// Lives in services/, not room-members/: requireRoomMember is middleware, and middleware never reaches into an api/v1 domain folder.
export default async function getRoomMemberByToken(sessionToken: string) {
	return prisma.roomMember.findUnique({ where: { sessionToken } });
}
