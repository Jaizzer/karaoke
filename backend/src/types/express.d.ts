// Augments Express's Request type so req.user/req.roomMember are known without an as cast. requireAuth and
// requireRoomMember are the only places that set them, one per kind of caller.
import type { auth } from '../lib/auth.ts';
import type { RoomMemberModel } from '../database/generated/models/RoomMember.ts';

type Session = typeof auth.$Infer.Session;

declare global {
	namespace Express {
		interface Request {
			user?: Session['user'];
			roomMember?: RoomMemberModel;
		}
	}
}

export {};
