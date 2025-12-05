// The guest's ongoing view of a room once joined; public route, gated by a locally-stored session token.
import { useEffect } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router';
import {
	getRoomMemberSession,
	clearRoomMemberSession,
} from '../lib/roomMemberStorage.ts';
import { usePolling } from '../lib/usePolling.ts';
import { apiFetch } from '../lib/api.ts';
import SongSearch from '../features/song-search/SongSearch.tsx';
import QueueList, { type QueueItem } from '../features/queue/QueueList.tsx';
import Card from '../components/Card.tsx';

interface QueueResponse {
	queueItems: QueueItem[];
}

interface Room {
	aiSearchEnabled: boolean;
	status: 'OPEN' | 'CLOSED';
}

const POLL_INTERVAL_MS = 3000;

export default function MemberRoomPage() {
	const { code } = useParams<{ code: string }>();
	const navigate = useNavigate();
	const session = code ? getRoomMemberSession(code) : null;

	const { data, refetch } = usePolling<QueueResponse>(
		session && code ? `/api/v1/rooms/${code}/queue` : null,
		POLL_INTERVAL_MS,
	);

	// Polled, not fetched once: how a guest still in the room finds out it closed without needing to reload.
	const { data: roomData } = usePolling<{ room: Room }>(
		code ? `/api/v1/rooms/${code}` : null,
		POLL_INTERVAL_MS,
	);
	const room = roomData?.room;

	useEffect(() => {
		if (!code || !room || room.status !== 'CLOSED') {
			return;
		}
		clearRoomMemberSession(code);
		navigate('/join', {
			replace: true,
			state: {
				notice: 'That room has closed. Join another with a code or QR.',
			},
		});
	}, [code, room, navigate]);

	// No stored token for this code, either they never joined or they're on
	// a different device. Either way, /join/:code is where to fix that.
	if (!code || !session) {
		return <Navigate to={`/join/${code ?? ''}`} replace />;
	}

	// Covers both "still loading" and "closed, about to redirect" so the search box and queue don't flash first.
	if (room?.status === 'CLOSED') {
		return (
			<p className='py-6 text-center text-sm text-text-muted'>
				That room has closed…
			</p>
		);
	}

	// Rebound to its own const so the closures below see the narrowed (non-null) type, not the outer widened one.
	const memberSession = session;

	async function handleRemove(item: QueueItem) {
		try {
			await apiFetch(`/api/v1/rooms/${code}/queue/${item.id}`, {
				method: 'DELETE',
				headers: {
					Authorization: `Bearer ${memberSession.sessionToken}`,
				},
			});
			refetch();
		} catch {
			// The next poll tick reconciles the list either way. A failed
			// remove just means the song is still there next refresh.
		}
	}

	return (
		<div className='space-y-6 px-4 py-6'>
			<Card className='space-y-1 p-4 text-center'>
				<p className='text-sm text-text-muted'>Joined as</p>
				<p className='text-lg font-bold text-text'>
					{memberSession.displayName}
				</p>
			</Card>

			<SongSearch
				code={code}
				sessionToken={memberSession.sessionToken}
				aiSearchAvailable={room?.aiSearchEnabled ?? false}
				onQueued={refetch}
			/>

			<QueueList
				queueItems={data?.queueItems ?? []}
				canRemove={(item) => item.addedById === memberSession.memberId}
				isOwn={(item) => item.addedById === memberSession.memberId}
				onRemove={(item) => void handleRemove(item)}
			/>
		</div>
	);
}
