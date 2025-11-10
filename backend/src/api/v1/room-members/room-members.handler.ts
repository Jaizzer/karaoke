import type { Request, Response } from 'express';
import { JoinRoomSchema } from '../../../lib/validators.ts';
import resolveRoom from '../../../lib/resolveRoom.ts';
import { joinRoom } from './room-members.service.ts';

// unauthenticated on purpose, this is how a guest gets a token in the first
// place so there's nothing to authenticate yet
export async function postJoin(req: Request, res: Response) {
	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	if (room.status !== 'OPEN') {
		res.status(403).json({ message: 'This room is closed.' });
		return;
	}

	const parsedBody = JoinRoomSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	const member = await joinRoom(room.id, parsedBody.data.displayName);

	// sessionToken sits alongside member, not inside it: anywhere a member object is shown to others, it must never carry this.
	res.status(201).json({
		member: {
			id: member.id,
			roomId: member.roomId,
			displayName: member.displayName,
		},
		sessionToken: member.sessionToken,
	});
}
