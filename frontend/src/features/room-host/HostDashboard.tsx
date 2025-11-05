// The host's control panel for a single room: shows the QR/code guests
// scan to join, and lets the host toggle auto-select and close the room.
// Grows in later milestones as the queue and now-playing controls are
// added here too — that's why this lives under features/ (composed into
// HostDisplayPage) rather than folded directly into the page, unlike the
// one-off form in RoomCreatePage.tsx.
import { useEffect, useState } from 'react';
import { useParams } from 'react-router';
import { QRCodeSVG } from 'qrcode.react';
import { apiFetch, ApiError } from '../../lib/api.ts';
import Card from '../../components/Card.tsx';
import Badge from '../../components/Badge.tsx';
import Button from '../../components/Button.tsx';

interface Room {
	code: string;
	name: string | null;
	autoSelect: boolean;
	status: 'OPEN' | 'CLOSED';
}

export default function HostDashboard() {
	const { code } = useParams<{ code: string }>();
	const [room, setRoom] = useState<Room | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [saving, setSaving] = useState(false);

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
		</div>
	);
}
