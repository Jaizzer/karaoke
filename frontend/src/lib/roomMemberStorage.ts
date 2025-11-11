// Where a guest's room-scoped identity lives once joined: no Better Auth account, just a bearer token, keyed by room code.
const KEY_PREFIX = 'karaoke:room-member:';

export interface RoomMemberSession {
	memberId: string;
	sessionToken: string;
	displayName: string;
}

export function getRoomMemberSession(code: string): RoomMemberSession | null {
	const raw = localStorage.getItem(KEY_PREFIX + code);
	if (!raw) {
		return null;
	}
	try {
		return JSON.parse(raw) as RoomMemberSession;
	} catch {
		return null;
	}
}

export function setRoomMemberSession(
	code: string,
	session: RoomMemberSession,
): void {
	localStorage.setItem(KEY_PREFIX + code, JSON.stringify(session));
}
