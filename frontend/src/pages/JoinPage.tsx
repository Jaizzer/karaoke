// Public: a guest scanning a QR code lands here without signing up; self-contained since this form has no reuse need.
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { apiFetch, ApiError } from '../lib/api.ts';
import {
	getRoomMemberSession,
	setRoomMemberSession,
} from '../lib/roomMemberStorage.ts';
import Card from '../components/Card.tsx';
import Input from '../components/Input.tsx';
import Button from '../components/Button.tsx';

interface Room {
	code: string;
	name: string | null;
	status: 'OPEN' | 'CLOSED';
}

interface JoinResponse {
	member: { displayName: string };
	sessionToken: string;
}

export default function JoinPage() {
	const { code } = useParams<{ code: string }>();
	const navigate = useNavigate();
	const [room, setRoom] = useState<Room | null>(null);
	const [displayName, setDisplayName] = useState('');
	const [status, setStatus] = useState<'loading' | 'idle' | 'joining'>(
		'loading',
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!code) {
			return;
		}

		// Already joined this room on this device, skip straight to it
		// instead of asking for a name again.
		if (getRoomMemberSession(code)) {
			navigate(`/rooms/${code}`, { replace: true });
			return;
		}

		apiFetch<{ room: Room }>(`/api/v1/rooms/${code}`)
			.then(({ room }) => {
				setRoom(room);
				setStatus('idle');
			})
			.catch((caught: unknown) => {
				setError(
					caught instanceof ApiError
						? caught.message
						: 'Something went wrong.',
				);
				setStatus('idle');
			});
	}, [code, navigate]);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (!code) {
			return;
		}
		setStatus('joining');
		setError(null);
		try {
			const { member, sessionToken } = await apiFetch<JoinResponse>(
				`/api/v1/rooms/${code}/join`,
				{ method: 'POST', body: JSON.stringify({ displayName }) },
			);
			setRoomMemberSession(code, {
				sessionToken,
				displayName: member.displayName,
			});
			navigate(`/rooms/${code}`);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: 'Something went wrong.',
			);
			setStatus('idle');
		}
	}

	if (status === 'loading') {
		return (
			<p className='py-6 text-center text-sm text-text-muted'>Loading…</p>
		);
	}

	if (!room) {
		return (
			<p className='py-6 text-center text-sm text-error'>
				{error ?? 'Room not found.'}
			</p>
		);
	}

	if (room.status === 'CLOSED') {
		return (
			<p className='py-6 text-center text-sm text-text-muted'>
				This room is closed.
			</p>
		);
	}

	return (
		<div className='flex min-h-screen items-center justify-center px-4'>
			<Card className='w-full max-w-sm space-y-4 p-6'>
				<h1 className='text-center text-2xl font-bold text-text'>
					{room.name ?? `Room ${room.code}`}
				</h1>
				<form
					onSubmit={(event) => void handleSubmit(event)}
					className='space-y-4'
				>
					<Input
						value={displayName}
						onChange={(event) => setDisplayName(event.target.value)}
						placeholder='Your name'
						required
					/>
					{error && <p className='text-sm text-error'>{error}</p>}
					<Button
						type='submit'
						disabled={status === 'joining'}
						className='w-full'
					>
						{status === 'joining' ? 'Joining…' : 'Join'}
					</Button>
				</form>
			</Card>
		</div>
	);
}
