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
	aiSearchEnabled: z.boolean().optional(),
	appendKaraoke: z.boolean().optional(),
	status: z.enum(['OPEN', 'CLOSED']).optional(),
});

export const JoinRoomSchema = z.object({
	displayName: z.string().min(1).max(50),
});

// useAiSearch/autoSelect are the guest's own per-search choice; the room only gates whether useAiSearch can take effect.
export const SearchSchema = z.object({
	query: z.string().min(1).max(200),
	useAiSearch: z.boolean().optional(),
	autoSelect: z.boolean().optional(),
});

export const AddQueueItemSchema = z.object({
	youtubeVideoId: z.string().min(1),
	title: z.string().min(1).max(300),
	channelTitle: z.string().min(1).max(300),
	thumbnailUrl: z.url(),
});

export const MoveQueueItemSchema = z.object({
	direction: z.enum(['up', 'down']),
});

// sessionId is an opaque per-tab id (crypto.randomUUID()), not a secret, just a coordination token.
export const ClaimHostSchema = z.object({
	sessionId: z.string().min(1).max(100),
});
