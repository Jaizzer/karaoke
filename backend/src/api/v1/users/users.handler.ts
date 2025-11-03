import type { Request, Response } from 'express';
import { UpdateUserSchema } from '../../../lib/validators.ts';
import { getOwnProfile, updateUserName } from './users.service.ts';

export async function getUser(req: Request, res: Response) {
	// requireAuth sets req.user before this runs; checking again here keeps this correct even if reused elsewhere.
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

	// Users can only fetch their own profile, so any other id is a 403 not a 404 (which would leak whether it exists).
	if (req.params.id !== req.user.id) {
		res.status(403).json({
			message: "Not allowed to view another user's profile.",
		});
		return;
	}

	const user = await getOwnProfile(req.params.id);
	res.status(200).json({ user });
}

export async function updateUser(req: Request, res: Response) {
	if (!req.user) {
		res.status(401).json({ message: 'Not signed in.' });
		return;
	}

	if (req.params.id !== req.user.id) {
		res.status(403).json({
			message: "Not allowed to update another user's profile.",
		});
		return;
	}

	const parsedBody = UpdateUserSchema.safeParse(req.body);
	if (!parsedBody.success) {
		res.status(400).json({ message: 'Invalid request body.' });
		return;
	}

	const user = await updateUserName(req.params.id, parsedBody.data.name);
	res.status(200).json({ user });
}
