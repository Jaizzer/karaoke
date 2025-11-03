// Augments Express's Request type so `req.user` is known to every handler
// without an `as` cast. `requireAuth` (src/middleware/authorization.ts) is
// the only place that actually sets it.
import type { auth } from '../lib/auth.ts';

type Session = typeof auth.$Infer.Session;

declare global {
	namespace Express {
		interface Request {
			user?: Session['user'];
		}
	}
}

export {};
