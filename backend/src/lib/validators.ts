import { z } from 'zod';

// Sign-up/sign-in bodies are validated internally by Better Auth; this file only covers our own custom routes.
export const UpdateUserSchema = z.object({
	name: z.string().min(1).max(100),
});
