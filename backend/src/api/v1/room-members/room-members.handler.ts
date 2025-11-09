import type { Request, Response } from 'express';
import { JoinRoomSchema } from '../../../lib/validators.ts';
import getRoomByCode from '../../../services/getRoomByCode.ts';
import { joinRoom } from './room-members.service.ts';

// unauthenticated on purpose, this is how a guest gets a token in the first
// place so there's nothing to authenticate yet
export async function postJoin(req: Request, res: Response) {
	const { code } = req.params;
	if (typeof code !== 'string') {
		res.status(400).json({ message: 'Invalid room code.' });
		return;
	}

	const room = await getRoomByCode(code);
	if (!room) {
		res.status(404).json({ message: 'Room not found.' });
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
