// Frontend counterpart to backend/src/lib/auth.ts, wrapping the same Better Auth REST API in typed methods
// and hooks. No baseURL on purpose, so requests stay same-origin (see vite.config.ts's proxy), sidestepping cross-site cookie restrictions.
import { createAuthClient } from 'better-auth/react';

export const authClient = createAuthClient({
	basePath: '/api/v1/authentication',
	fetchOptions: {
		credentials: 'include',
	},
});

export const { useSession, signUp, signIn, signOut } = authClient;
