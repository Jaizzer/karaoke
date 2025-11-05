// Host-only: creates a room, then hands off to HostDisplayPage for everything else; self-contained, no reuse need.
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { apiFetch, ApiError } from '../lib/api.ts';
import Card from '../components/Card.tsx';
import Input from '../components/Input.tsx';
import Button from '../components/Button.tsx';

interface Room {
	code: string;
}

export default function RoomCreatePage() {
	const navigate = useNavigate();
	const [name, setName] = useState('');
	const [status, setStatus] = useState<'idle' | 'creating'>('idle');
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setStatus('creating');
		setError(null);
		try {
			const { room } = await apiFetch<{ room: Room }>('/api/v1/rooms', {
				method: 'POST',
				body: JSON.stringify(name.trim() ? { name: name.trim() } : {}),
			});
			navigate(`/rooms/${room.code}/host`);
		} catch (caught) {
			setError(
				caught instanceof ApiError
					? caught.message
					: 'Something went wrong.',
			);
			setStatus('idle');
		}
	}

	return (
		<div className='space-y-6 py-6'>
			<Card className='space-y-4 p-6'>
				<h2 className='text-sm font-bold tracking-wide text-text-muted uppercase'>
					Host a room
				</h2>
				<form
					onSubmit={(event) => void handleSubmit(event)}
					className='space-y-4'
				>
					<Input
						value={name}
						onChange={(event) => setName(event.target.value)}
						placeholder='Room name (optional)'
					/>
					{error && <p className='text-sm text-error'>{error}</p>}
					<Button type='submit' disabled={status === 'creating'}>
						{status === 'creating' ? 'Creating…' : 'Create room'}
					</Button>
				</form>
			</Card>
		</div>
	);
}
