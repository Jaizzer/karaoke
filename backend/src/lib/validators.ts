import { z } from 'zod';

// Sign-up/sign-in bodies are validated internally by Better Auth; this file only covers our own custom routes.
export const UpdateUserSchema = z.object({
	name: z.string().min(1).max(100),
});

export const CreateRoomSchema = z.object({
	name: z.string().min(1).max(100).optional(),
});

export const UpdateRoomSchema = z.object({
	name: z.string().min(1).max(100).optional(),
	autoSelect: z.boolean().optional(),
	status: z.enum(['OPEN', 'CLOSED']).optional(),
});

export const JoinRoomSchema = z.object({
	displayName: z.string().min(1).max(50),
});

export const SearchSchema = z.object({
	query: z.string().min(1).max(200),
});
