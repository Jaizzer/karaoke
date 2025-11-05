import type { Request, Response } from 'express';
import { CreateRoomSchema, UpdateRoomSchema } from '../../../lib/validators.ts';
import { createRoom, getRoomByCode, updateRoom } from './rooms.service.ts';

export async function postRoom(req: Request, res: Response) {
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

	const parsedBody = CreateRoomSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	const room = await createRoom(req.user.id, parsedBody.data.name);
	res.status(201).json({ room });
}

// Unauthenticated on purpose: a room's code/status aren't sensitive and guests need this before joining.
export async function getRoom(req: Request, res: Response) {
	// Express types `req.params[key]` as `string | string[]` (arrays only
	// happen for repeated wildcard segments, never a plain `:code`) — this
	// guard is what the router pattern already guarantees at runtime, made
	// explicit for the type checker.
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

	res.status(200).json({ room });
}

export async function patchRoom(req: Request, res: Response) {
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

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
