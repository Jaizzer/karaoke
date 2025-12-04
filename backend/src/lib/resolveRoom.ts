import type { Request, Response } from 'express';
import getRoomByCode from '../services/getRoomByCode.ts';
import closeStaleRoom from '../services/closeStaleRoom.ts';

// Shared by every room-scoped handler; resolves :code to a Room or writes its own 400/404 and returns undefined.
export default async function resolveRoom(req: Request, res: Response) {
	// Makes explicit for the type checker what the router pattern already guarantees at runtime.
	const { code } = req.params;
	if (typeof code !== 'string') {
		res.status(400).json({ message: 'Invalid room code.' });
		return undefined;
	}

	const room = await getRoomByCode(code);
	if (!room) {
		res.status(404).json({ message: 'Room not found.' });
		return undefined;
	}

	// Every read through here doubles as the lazy 24h-abandoned-room sweep, so active rooms never actually go stale.
	return closeStaleRoom(room);
}
