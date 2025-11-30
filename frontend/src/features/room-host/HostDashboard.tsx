// The host's control panel for a single room: QR/code to join, auto-select
// toggle, close-room control, the live queue, and playback — polls the
// queue and auto-advances to the next song whenever nothing is playing.
import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch, ApiError } from '../../lib/api.ts';
import { usePolling } from '../../lib/usePolling.ts';
import Card from '../../components/Card.tsx';
import Badge from '../../components/Badge.tsx';
import Button from '../../components/Button.tsx';
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
	aiSearchEnabled: boolean;
	appendKaraoke: boolean;
	status: 'OPEN' | 'CLOSED';
}

interface QueueResponse {
	queueItems: QueueItem[];
}

const POLL_INTERVAL_MS = 3000;

export default function HostDashboard() {
	const { code } = useParams<{ code: string }>();
	const [room, setRoom] = useState<Room | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);
	const [showRoomCode, setShowRoomCode] = useState(false);

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

	useEffect(() => {
		if (!showRoomCode) {
			return;
		}
		function handleKeyDown(event: KeyboardEvent) {
			if (event.key === 'Escape') {
				setShowRoomCode(false);
			}
		}
		window.addEventListener('keydown', handleKeyDown);
		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	}, [showRoomCode]);

	useEffect(() => {
		if (!code) {
			return;
		}
		apiFetch<{ room: Room }>(`/api/v1/rooms/${code}`)
			.then(({ room }) => {
				setRoom(room);
			})
			.catch((caught: unknown) => {
				setError(
					caught instanceof ApiError
						? caught.message
						: 'Something went wrong.',
				);
			});
	}, [code]);

	// auto-advance: whenever nothing is playing but something is queued, start
	// it. guarded by a ref (not state) so an in-flight POST can't double-fire if
	// the next poll tick lands before this one resolves.
	const startingRef = useRef(false);
	useEffect(() => {
		if (!code || nowPlaying || !nextQueued || startingRef.current) {
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
	}, [code, nowPlaying, nextQueued, refetchQueue]);

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
			setRoom(updated);
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

	if (!room) {
		return (
			<p className='py-6 text-sm text-text-muted'>
				{error ?? 'Loading…'}
			</p>
		);
	}

	const joinUrl = `${window.location.origin}/join/${room.code}`;

	return (
		<div className='space-y-6 py-6'>
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
				<div
					className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm'
					onClick={() => {
						setShowRoomCode(false);
					}}
				>
					<Card
						className='w-full max-w-sm space-y-4 p-6 text-center'
						onClick={(event) => {
							event.stopPropagation();
						}}
					>
						<div className='flex items-center justify-center gap-2'>
							<h2 className='text-xl font-bold text-text'>
								{room.name ?? `Room ${room.code}`}
							</h2>
							<Badge
								tone={
									room.status === 'OPEN'
										? 'success'
										: 'default'
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
						<p className='text-sm text-text-muted'>
							Scan to join, or go to{' '}
							<span className='font-mono text-text'>
								{joinUrl}
							</span>
						</p>
						<Button
							type='button'
							variant='ghost'
							onClick={() => {
								setShowRoomCode(false);
							}}
						>
							Close
						</Button>
					</Card>
				</div>
			)}

			<Card className='space-y-4 p-6'>
				<div className='flex items-center justify-between gap-4'>
					<div>
						<h3 className='text-sm font-semibold text-text'>
							Enable AI search
						</h3>
						<p className='text-sm text-text-muted'>
							Rank/filter results with an LLM. Turn off to use
							YouTube&apos;s own results directly — faster, no AI
							dependency.
						</p>
					</div>
					<Button
						type='button'
						variant='ghost'
						disabled={saving || room.status === 'CLOSED'}
						onClick={() =>
							void updateRoom({
								aiSearchEnabled: !room.aiSearchEnabled,
							})
						}
					>
						{room.aiSearchEnabled ? 'On' : 'Off'}
					</Button>
				</div>

				<div className='flex items-center justify-between gap-4'>
					<div>
						<h3 className='text-sm font-semibold text-text'>
							Append &quot;karaoke&quot;
						</h3>
						<p className='text-sm text-text-muted'>
							Bias every search toward singable
							karaoke/instrumental versions instead of original
							recordings.
						</p>
					</div>
					<Button
						type='button'
						variant='ghost'
						disabled={saving || room.status === 'CLOSED'}
						onClick={() =>
							void updateRoom({
								appendKaraoke: !room.appendKaraoke,
							})
						}
					>
						{room.appendKaraoke ? 'On' : 'Off'}
					</Button>
				</div>

				{error && <p className='text-sm text-error'>{error}</p>}

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
			</Card>

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
