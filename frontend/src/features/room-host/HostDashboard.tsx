// The host's control panel: QR/code, settings, the live queue, and playback.
// Polls the queue and auto-advances whenever nothing's playing.
import { useRef, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch, ApiError } from '../../lib/api.ts';
import { usePolling } from '../../lib/usePolling.ts';
import { useSession } from '../../lib/authClient.ts';
import Badge from '../../components/Badge.tsx';
import Button from '../../components/Button.tsx';
import Switch from '../../components/Switch.tsx';
import Overlay from '../../components/Overlay.tsx';
import {
	NowPlayingCard,
	NextUpCard,
	UpNextList,
	type QueueItem,
} from '../queue/QueueList.tsx';
import YoutubePlayer from '../playback/YoutubePlayer.tsx';
import SongSearch from '../song-search/SongSearch.tsx';

interface Room {
	code: string;
	name: string | null;
	hostId: string;
	aiSearchEnabled: boolean;
	appendKaraoke: boolean;
	status: 'OPEN' | 'CLOSED';
	activeHostSessionId: string | null;
}

interface QueueResponse {
	queueItems: QueueItem[];
}

const POLL_INTERVAL_MS = 3000;

export default function HostDashboard() {
	const { code } = useParams<{ code: string }>();
	const navigate = useNavigate();
	const { data: session } = useSession();
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [showRoomCode, setShowRoomCode] = useState(false);
	const [showSettings, setShowSettings] = useState(false);
	const [linkCopied, setLinkCopied] = useState(false);

	// One id per mount, used to claim this room via claim-host so only the real host can load this
	// dashboard; whichever tab claims most recently is the only one still in control (see lockedOut below).
	const [claimedSessionId] = useState(() => crypto.randomUUID());
	const [claimStatus, setClaimStatus] = useState<
		'pending' | 'claimed' | 'forbidden'
	>('pending');

	const { data: queueData, refetch: refetchQueue } =
		usePolling<QueueResponse>(
			code ? `/api/v1/rooms/${code}/queue` : null,
			POLL_INTERVAL_MS,
		);
	const queueItems = queueData?.queueItems ?? [];
	const nowPlaying = queueItems.find((item) => item.status === 'PLAYING');
	const upNext = queueItems.filter((item) => item.status === 'QUEUED');
	const nextQueued = upNext[0];
	const restOfQueue = upNext.slice(1);

	// Polled, not fetched once, so a stale dashboard (closed elsewhere, or auto-expired) leaves instead of lingering.
	const { data: roomData, refetch: refetchRoom } = usePolling<{
		room: Room;
	}>(code ? `/api/v1/rooms/${code}` : null, POLL_INTERVAL_MS);
	const room = roomData?.room ?? null;

	useEffect(() => {
		if (room?.status === 'CLOSED') {
			navigate('/');
		}
	}, [room, navigate]);

	useEffect(() => {
		if (!code || !session) {
			return;
		}
		apiFetch<{ room: Room }>(`/api/v1/rooms/${code}/claim-host`, {
			method: 'POST',
			body: JSON.stringify({ sessionId: claimedSessionId }),
		})
			.then(() => {
				setClaimStatus('claimed');
				refetchRoom();
			})
			.catch((caught: unknown) => {
				setClaimStatus(
					caught instanceof ApiError && caught.status === 403
						? 'forbidden'
						: 'pending',
				);
			});
		// refetchRoom is stable (usePolling memoizes it with useCallback), so this
		// only re-runs on an actual code/session change, not on every room poll tick.
	}, [code, session, refetchRoom, claimedSessionId]);

	// true once another tab/device has claimed this room after we did:
	// room.activeHostSessionId no longer matches the id we claimed with.
	const lockedOut =
		claimStatus === 'claimed' &&
		room?.activeHostSessionId !== null &&
		room?.activeHostSessionId !== undefined &&
		room.activeHostSessionId !== claimedSessionId;

	// Auto-advances when nothing's playing but something's queued; ref-guarded against double-fire, and
	// gated on lockedOut too, since this effect keeps running even while the player itself is hidden.
	const startingRef = useRef(false);
	useEffect(() => {
		if (
			!code ||
			lockedOut ||
			nowPlaying ||
			!nextQueued ||
			startingRef.current
		) {
			return;
		}
		startingRef.current = true;
		apiFetch(`/api/v1/rooms/${code}/queue/${nextQueued.id}/start`, {
			method: 'POST',
		})
			.then(() => {
				refetchQueue();
			})
			.catch(() => {
				// Next poll tick will just see the same QUEUED item and retry.
			})
			.finally(() => {
				startingRef.current = false;
			});
	}, [code, lockedOut, nowPlaying, nextQueued, refetchQueue]);

	async function handleSongEnded() {
		if (!code || !nowPlaying) {
			return;
		}
		try {
			await apiFetch(
				`/api/v1/rooms/${code}/queue/${nowPlaying.id}/finish`,
				{
					method: 'POST',
				},
			);
		} finally {
			refetchQueue();
		}
	}

	async function handleRemove(item: QueueItem) {
		if (!code) {
			return;
		}
		await apiFetch(`/api/v1/rooms/${code}/queue/${item.id}`, {
			method: 'DELETE',
		});
		refetchQueue();
	}

	async function handleMove(item: QueueItem, direction: 'up' | 'down') {
		if (!code) {
			return;
		}
		try {
			await apiFetch(`/api/v1/rooms/${code}/queue/${item.id}/move`, {
				method: 'POST',
				body: JSON.stringify({ direction }),
			});
			refetchQueue();
		} catch {
			// 409 at either end of the queue, nothing to swap with and nothing to
			// show for it.
		}
	}

	async function updateRoom(
		data: Partial<
			Pick<Room, 'aiSearchEnabled' | 'appendKaraoke' | 'status'>
		>,
	) {
		if (!room) {
			return;
		}
		setSaving(true);
		setError(null);
		try {
			const { room: updated } = await apiFetch<{ room: Room }>(
				`/api/v1/rooms/${room.code}`,
				{ method: 'PATCH', body: JSON.stringify(data) },
			);
			if (updated.status === 'CLOSED') {
				// Nothing left to manage here, so send the host home immediately instead of waiting for the next poll.
				navigate('/');
				return;
			}
			refetchRoom();
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: 'Something went wrong.',
			);
		} finally {
			setSaving(false);
		}
	}

	if (claimStatus === 'forbidden') {
		return (
			<p className='py-6 text-sm text-error'>
				You're not the host of this room.
			</p>
		);
	}

	if (lockedOut) {
		return (
			<p className='py-6 text-sm text-text-muted'>
				This room is being controlled from another tab or device.
			</p>
		);
	}

	// Covers both "still loading" and "closed, about to redirect" so the dashboard doesn't flash first.
	if (!room || room.status === 'CLOSED') {
		return (
			<p className='py-6 text-sm text-text-muted'>
				{error ?? 'Loading…'}
			</p>
		);
	}

	const joinUrl = `${window.location.origin}/join/${room.code}`;

	async function handleCopyJoinUrl() {
		try {
			await navigator.clipboard.writeText(joinUrl);
			setLinkCopied(true);
			setTimeout(() => {
				setLinkCopied(false);
			}, 2000);
		} catch {
			// clipboard permission denied or unavailable, the URL is still right
			// there in the card to select and copy by hand.
		}
	}

	return (
		<div className='space-y-6 py-6'>
			<div className='flex items-center justify-between gap-2'>
				<div className='flex items-center gap-2'>
					<button
						type='button'
						onClick={() => {
							setShowRoomCode(true);
						}}
						className='flex items-center gap-2 rounded-full border border-border bg-transparent px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-accent hover:text-text'
					>
						<svg
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='h-4 w-4'
						>
							<circle cx='18' cy='5' r='3' />
							<circle cx='6' cy='12' r='3' />
							<circle cx='18' cy='19' r='3' />
							<line x1='8.6' y1='10.5' x2='15.4' y2='6.5' />
							<line x1='8.6' y1='13.5' x2='15.4' y2='17.5' />
						</svg>
						Share Karaoke
					</button>

					<button
						type='button'
						onClick={() => {
							setShowSettings(true);
						}}
						aria-label='Settings'
						className='flex items-center gap-2 rounded-full border border-border bg-transparent px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-accent hover:text-text'
					>
						<svg
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='h-4 w-4'
						>
							<circle cx='12' cy='12' r='3' />
							<path d='M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' />
						</svg>
						Settings
					</button>
				</div>

				{room.status === 'OPEN' && (
					<Button
						type='button'
						variant='ghost'
						disabled={saving}
						onClick={() => void updateRoom({ status: 'CLOSED' })}
					>
						Close room
					</Button>
				)}
			</div>

			<SongSearch
				code={room.code}
				aiSearchAvailable={room.aiSearchEnabled}
				onQueued={refetchQueue}
			/>

			<NextUpCard
				item={nextQueued}
				canRemove={() => true}
				onRemove={(item) => void handleRemove(item)}
				onMove={(item, direction) => void handleMove(item, direction)}
			/>

			<YoutubePlayer
				videoId={nowPlaying?.youtubeVideoId}
				onEnded={() => void handleSongEnded()}
			/>

			<NowPlayingCard
				item={nowPlaying}
				canRemove={() => true}
				onRemove={(item) => void handleRemove(item)}
			/>

			{showRoomCode && (
				<Overlay
					onClose={() => {
						setShowRoomCode(false);
					}}
				>
					<div className='flex items-center justify-center gap-2'>
						<h2 className='text-xl font-bold text-text'>
							{room.name ?? `Room ${room.code}`}
						</h2>
						<Badge
							tone={
								room.status === 'OPEN' ? 'success' : 'default'
							}
						>
							{room.status}
						</Badge>
					</div>

					<p className='font-mono text-4xl font-bold tracking-widest text-text'>
						{room.code}
					</p>
					<div className='flex justify-center rounded-md bg-white p-4'>
						<QRCodeSVG value={joinUrl} size={200} />
					</div>
					<p className='text-sm text-text-muted'>Scan to join</p>
					<Button
						type='button'
						variant='ghost'
						onClick={() => void handleCopyJoinUrl()}
						className='mr-3 inline-flex items-center gap-2'
					>
						<svg
							viewBox='0 0 24 24'
							fill='none'
							stroke='currentColor'
							strokeWidth='2'
							strokeLinecap='round'
							strokeLinejoin='round'
							className='h-4 w-4'
						>
							<rect x='9' y='9' width='11' height='11' rx='2' />
							<path d='M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1' />
						</svg>
						{linkCopied ? 'Copied!' : 'Copy link'}
					</Button>
				</Overlay>
			)}

			{showSettings && (
				<Overlay
					onClose={() => {
						setShowSettings(false);
					}}
				>
					<h2 className='text-lg font-bold text-text'>
						Room settings
					</h2>

					<Switch
						label='Enable AI search'
						description="Rank/filter results with an LLM. Off uses YouTube's own results directly — faster, no AI dependency."
						checked={room.aiSearchEnabled}
						disabled={saving}
						onChange={(checked) =>
							void updateRoom({ aiSearchEnabled: checked })
						}
					/>

					<Switch
						label='Append "karaoke"'
						description='Bias every search toward singable karaoke/instrumental versions instead of original recordings.'
						checked={room.appendKaraoke}
						disabled={saving}
						onChange={(checked) =>
							void updateRoom({ appendKaraoke: checked })
						}
					/>
				</Overlay>
			)}

			{error && <p className='text-sm text-error'>{error}</p>}

			{restOfQueue.length > 0 && (
				<div className='space-y-2'>
					<h3 className='text-sm font-semibold text-text'>
						Also queued
					</h3>
					<UpNextList
						items={restOfQueue}
						canRemove={() => true}
						onRemove={(item) => void handleRemove(item)}
						onMove={(item, direction) =>
							void handleMove(item, direction)
						}
					/>
				</div>
			)}
		</div>
	);
}
