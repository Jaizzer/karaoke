import type { Request, Response } from 'express';
import { SearchSchema } from '../../../lib/validators.ts';
import resolveRoom from '../../../lib/resolveRoom.ts';
import ServiceNotConfiguredError from '../../../lib/serviceNotConfiguredError.ts';
import { searchSongs } from './search.service.ts';

export async function postSearch(req: Request, res: Response) {
	if (!req.roomMember) {
		res.status(401).json({ message: 'Not joined to a room.' });
		return;
	}

	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	// Same reasoning queue routes use: a room member's token
	// is only valid for the room it joined, not any room whose code happens
	// to appear in the URL.
	if (req.roomMember.roomId !== room.id) {
		res.status(403).json({ message: 'Not a member of this room.' });
		return;
	}

	if (room.status !== 'OPEN') {
		res.status(403).json({ message: 'This room is closed.' });
		return;
	}

	const parsedBody = SearchSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	let results;
	try {
		results = await searchSongs(parsedBody.data.query, room.autoSelect);
	} catch (error) {
		if (error instanceof ServiceNotConfiguredError) {
			res.status(503).json({
				message: 'Search is not available right now.',
			});
			return;
		}
		throw error;
	}

	res.status(200).json({ results, autoSelect: room.autoSelect });
}
