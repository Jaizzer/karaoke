import type { Request, Response } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../../lib/auth.ts';
import resolveRoom from '../../../lib/resolveRoom.ts';
import { getBearerToken } from '../../../middleware/requireRoomMember.ts';
import getRoomMemberByToken from '../../../services/getRoomMemberByToken.ts';
import { getHostMember } from '../room-members/room-members.service.ts';
import {
	AddQueueItemSchema,
	MoveQueueItemSchema,
} from '../../../lib/validators.ts';
import {
	listQueueItems,
	addQueueItem,
	getQueueItemById,
	removeQueueItem,
	startQueueItem,
	finishQueueItem,
	moveQueueItem,
} from './queue.service.ts';

// Unauthenticated on purpose, same as GET /:code in rooms.handler.ts: both host and guests poll this.
export async function getQueue(req: Request, res: Response) {
	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	const queueItems = await listQueueItems(room.id);
	res.status(200).json({ queueItems });
}

// Same two-caller shape as deleteQueueItem: host (session) or a joined guest (bearer token) can both add a
// song. Token is checked before session, since a browser with both tabs open sends the host's cookie too.
export async function postQueueItem(req: Request, res: Response) {
	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	const token = getBearerToken(req);
	const member = token ? await getRoomMemberByToken(token) : null;

	let addedById: string;
	if (member) {
		if (member.roomId !== room.id) {
			res.status(403).json({ message: 'Not a member of this room.' });
			return;
		}
		addedById = member.id;
	} else if (token) {
		// token was sent but didn't resolve to a member: stale or invalid,
		// don't fall back to host
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
		const hostMember = await getHostMember(room.id);
		if (!hostMember) {
			res.status(500).json({ message: 'Host membership not found.' });
			return;
		}
		addedById = hostMember.id;
	}

	if (room.status !== 'OPEN') {
		res.status(403).json({ message: 'This room is closed.' });
		return;
	}

	const parsedBody = AddQueueItemSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	const queueItem = await addQueueItem(room.id, addedById, parsedBody.data);
	res.status(201).json({ queueItem });
}

// The one route with two allowed actors (host, or the guest who added the item), so both credentials get
// resolved inline, token before session, same reasoning as postQueueItem above.
export async function deleteQueueItem(req: Request, res: Response) {
	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	const { id } = req.params;
	if (typeof id !== 'string') {
		res.status(400).json({ message: 'Invalid queue item id.' });
		return;
	}

	const queueItem = await getQueueItemById(id);
	if (queueItem?.roomId !== room.id) {
		res.status(404).json({ message: 'Queue item not found.' });
		return;
	}

	const token = getBearerToken(req);
	const member = token ? await getRoomMemberByToken(token) : null;

	if (member) {
		if (member.id !== queueItem.addedById) {
			res.status(403).json({
				message: 'Not allowed to remove this song.',
			});
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
			res.status(401).json({ message: 'Not signed in.' });
			return;
		}
	}

	await removeQueueItem(queueItem.id);
	res.status(204).send();
}

async function resolveHostQueueItem(req: Request, res: Response) {
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return undefined;
	}

	const room = await resolveRoom(req, res);
	if (!room) {
		return undefined;
	}

	if (room.hostId !== req.user.id) {
		res.status(403).json({ message: 'Not allowed to control this room.' });
		return undefined;
	}

	const { id } = req.params;
	if (typeof id !== 'string') {
		res.status(400).json({ message: 'Invalid queue item id.' });
		return undefined;
	}

	const queueItem = await getQueueItemById(id);
	if (queueItem?.roomId !== room.id) {
		res.status(404).json({ message: 'Queue item not found.' });
		return undefined;
	}

	return queueItem;
}

export async function postStartQueueItem(req: Request, res: Response) {
	const queueItem = await resolveHostQueueItem(req, res);
	if (!queueItem) {
		return;
	}

	const updated = await startQueueItem(queueItem.id);
	res.status(200).json({ queueItem: updated });
}

export async function postFinishQueueItem(req: Request, res: Response) {
	const queueItem = await resolveHostQueueItem(req, res);
	if (!queueItem) {
		return;
	}

	const updated = await finishQueueItem(queueItem.id);
	res.status(200).json({ queueItem: updated });
}

export async function postMoveQueueItem(req: Request, res: Response) {
	const queueItem = await resolveHostQueueItem(req, res);
	if (!queueItem) {
		return;
	}

	const parsedBody = MoveQueueItemSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	const updated = await moveQueueItem(
		queueItem.id,
		parsedBody.data.direction,
	);
	if (!updated) {
		res.status(409).json({ message: 'Cannot move this item further.' });
		return;
	}

	res.status(200).json({ queueItem: updated });
}
