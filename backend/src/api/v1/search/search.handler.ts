import type { Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../../lib/auth.ts';
import { SearchSchema } from '../../../lib/validators.ts';
import resolveRoom from '../../../lib/resolveRoom.ts';
import ServiceNotConfiguredError from '../../../lib/serviceNotConfiguredError.ts';
import { getBearerToken } from '../../../middleware/requireRoomMember.ts';
import getRoomMemberByToken from '../../../services/getRoomMemberByToken.ts';
import { searchSongs } from './search.service.ts';

// Same two-caller shape as postQueueItem: host (session) or a joined guest (bearer token) can both search,
// token checked before session so an explicit bearer token wins over an incidental host cookie.
export async function postSearch(req: Request, res: Response) {
	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	const token = getBearerToken(req);
	const member = token ? await getRoomMemberByToken(token) : null;

	if (member) {
		// Same reasoning queue routes use: a member's token is only valid for the room it joined.
		if (member.roomId !== room.id) {
			res.status(403).json({ message: 'Not a member of this room.' });
			return;
		}
	} else if (token) {
		res.status(401).json({ message: 'Not joined to a room.' });
		return;
	} else {
		const session = await auth.api.getSession({
			headers: fromNodeHeaders(req.headers),
		});
		const isHost = session?.user.id === room.hostId;
		if (!isHost) {
			res.status(401).json({ message: 'Not joined to a room.' });
			return;
		}
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

	// The room only grants permission; the caller still opts in per search, and needs AI search on to use autoSelect.
	const useAiSearch =
		room.aiSearchEnabled && (parsedBody.data.useAiSearch ?? false);
	const autoSelect = useAiSearch && (parsedBody.data.autoSelect ?? false);

	let results;
	try {
		results = await searchSongs(
			parsedBody.data.query,
			room.appendKaraoke,
			useAiSearch,
			autoSelect,
		);
	} catch (error) {
		if (error instanceof ServiceNotConfiguredError) {
			res.status(503).json({
				message: 'Search is not available right now.',
			});
			return;
		}
		throw error;
	}

	res.status(200).json({
		results,
		autoSelect,
		aiSearchAvailable: room.aiSearchEnabled,
	});
}
