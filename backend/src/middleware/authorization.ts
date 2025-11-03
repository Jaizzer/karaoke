// Route guard for anything that shouldn't be reachable without being
// logged in. Usage: `router.get('/:id', requireAuth, getUser)`.
import type { Request, Response, NextFunction } from 'express';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../lib/auth.ts';

export default async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	// Better Auth reads the session cookie straight from request headers; fromNodeHeaders just adapts Node's headers to Fetch's Headers type.
	const session = await auth.api.getSession({
		headers: fromNodeHeaders(req.headers),
	});

	if (!session) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

	req.user = session.user;
	next();
}
