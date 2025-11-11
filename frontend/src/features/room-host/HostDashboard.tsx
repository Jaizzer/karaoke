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
import QueueList, { type QueueItem } from '../queue/QueueList.tsx';
import YoutubePlayer from '../playback/YoutubePlayer.tsx';

interface Room {
	code: string;
	name: string | null;
	autoSelect: boolean;
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

	const { data: queueData, refetch: refetchQueue } =
		usePolling<QueueResponse>(
			code ? `/api/v1/rooms/${code}/queue` : null,
			POLL_INTERVAL_MS,
		);
	const queueItems = queueData?.queueItems ?? [];
	const nowPlaying = queueItems.find((item) => item.status === 'PLAYING');
	const nextQueued = queueItems.find((item) => item.status === 'QUEUED');

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

	async function updateRoom(
		data: Partial<Pick<Room, 'autoSelect' | 'status'>>,
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
			{nowPlaying && (
				<YoutubePlayer
					videoId={nowPlaying.youtubeVideoId}
					onEnded={() => void handleSongEnded()}
				/>
			)}

			<Card className='space-y-4 p-6 text-center'>
				<div className='flex items-center justify-center gap-2'>
					<h2 className='text-2xl font-bold text-text'>
						{room.name ?? `Room ${room.code}`}
					</h2>
					<Badge
						tone={room.status === 'OPEN' ? 'success' : 'default'}
					>
						{room.status}
					</Badge>
				</div>

				<div className='flex justify-center rounded-md bg-white p-4'>
					<QRCodeSVG value={joinUrl} size={200} />
				</div>

				<p className='text-sm text-text-muted'>
					Scan to join, or go to{' '}
					<span className='font-mono text-text'>{joinUrl}</span>
				</p>
				<p className='font-mono text-3xl font-bold tracking-widest text-text'>
					{room.code}
				</p>
			</Card>

			<Card className='space-y-4 p-6'>
				<div className='flex items-center justify-between gap-4'>
					<div>
						<h3 className='text-sm font-semibold text-text'>
							Auto-select
						</h3>
						<p className='text-sm text-text-muted'>
							Let AI pick the best match instead of showing guests
							a top-5 to choose from.
						</p>
					</div>
					<Button
						type='button'
						variant='ghost'
						disabled={saving || room.status === 'CLOSED'}
						onClick={() =>
							void updateRoom({ autoSelect: !room.autoSelect })
						}
					>
						{room.autoSelect ? 'On' : 'Off'}
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

			<QueueList
				queueItems={queueItems}
				canRemove={() => true}
				onRemove={(item) => void handleRemove(item)}
			/>
		</div>
	);
}
