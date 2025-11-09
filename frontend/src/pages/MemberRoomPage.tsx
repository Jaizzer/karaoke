// The guest's ongoing view of a room once joined — public route, gated by
// a locally-stored session token rather than a server session. Minimal for
// now; grows to compose the song-search and queue features in later
// milestones, the same way HostDisplayPage composes HostDashboard.
import { Navigate, useParams } from 'react-router';
import { getRoomMemberSession } from '../lib/roomMemberStorage.ts';
import Card from '../components/Card.tsx';

export default function MemberRoomPage() {
	const { code } = useParams<{ code: string }>();
	const session = code ? getRoomMemberSession(code) : null;

	// No stored token for this code, either they never joined or they're on
	// a different device. Either way, /join/:code is where to fix that.
	if (!code || !session) {
		return <Navigate to={`/join/${code ?? ''}`} replace />;
	}

	return (
		<div className='space-y-6 px-4 py-6'>
			<Card className='space-y-2 p-6 text-center'>
				<p className='text-sm text-text-muted'>Joined as</p>
				<p className='text-xl font-bold text-text'>
					{session.displayName}
				</p>
			</Card>
		</div>
	);
}
