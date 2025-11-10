// Route guard for guest-facing endpoints; guests carry a bearer token instead of a Better Auth session (see
// room-members.service.ts's joinRoom). Only checks "who is this token," not the token's room against the URL.
import type { Request, Response, NextFunction } from 'express';
import getRoomMemberByToken from '../services/getRoomMemberByToken.ts';

// Exported separately since queue.handler.ts's DELETE route needs to resolve caller-vs-host itself, not through this middleware.
export function getBearerToken(req: Request): string | undefined {
	const authHeader = req.headers.authorization;
	return authHeader?.startsWith('Bearer ')
		? authHeader.slice('Bearer '.length)
		: undefined;
}

export default async function requireRoomMember(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const token = getBearerToken(req);
	if (!token) {
		res.status(401).json({ message: 'Not joined to a room.' });
		return;
	}

	const member = await getRoomMemberByToken(token);
	if (!member) {
		res.status(401).json({ message: 'Not joined to a room.' });
		return;
	}

	req.roomMember = member;
	next();
}
