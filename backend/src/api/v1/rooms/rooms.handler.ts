import type { Request, Response } from 'express';
import { CreateRoomSchema, UpdateRoomSchema } from '../../../lib/validators.ts';
import resolveRoom from '../../../lib/resolveRoom.ts';
import { createRoom, updateRoom, findOpenRoomByHost } from './rooms.service.ts';

export async function postRoom(req: Request, res: Response) {
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

	const existing = await findOpenRoomByHost(req.user.id);
	if (existing) {
		res.status(409).json({
			message: 'Close your current room before starting a new one.',
			room: existing,
		});
		return;
	}

	const parsedBody = CreateRoomSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	const room = await createRoom(
		req.user.id,
		req.user.name,
		parsedBody.data.name,
	);
	res.status(201).json({ room });
}

// Lets the frontend decide whether to show "Host a room" or a link to the host's already-open room.
export async function getMyRoom(req: Request, res: Response) {
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

	const room = await findOpenRoomByHost(req.user.id);
	res.status(200).json({ room });
}

// Unauthenticated on purpose: a room's code/status aren't sensitive and guests need this before joining.
export async function getRoom(req: Request, res: Response) {
	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	res.status(200).json({ room });
}

export async function patchRoom(req: Request, res: Response) {
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

	const room = await resolveRoom(req, res);
	if (!room) {
		return;
	}

	// Same 403-not-404 reasoning as users.handler.ts: found but not this caller's, so "not allowed," not "missing."
	if (room.hostId !== req.user.id) {
		res.status(403).json({ message: 'Not allowed to modify this room.' });
		return;
	}

	const parsedBody = UpdateRoomSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	const updated = await updateRoom(room.id, parsedBody.data);
	res.status(200).json({ room: updated });
}
