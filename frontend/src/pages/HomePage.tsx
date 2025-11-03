// The signed-in landing page, deliberately minimal: proves the full stack works end to end via GET/PUT
// /api/v1/users/:id. Build the first real feature as a sibling page composed in from here.
import { useState } from 'react';
import { useSession } from '../lib/authClient.ts';
import { apiFetch, ApiError } from '../lib/api.ts';
import Card from '../components/Card.tsx';
import Input from '../components/Input.tsx';
import Button from '../components/Button.tsx';

interface User {
	id: string;
	name: string | null;
}

export default function HomePage() {
	const { data: session } = useSession();
	const [name, setName] = useState(session?.user.name ?? '');
	const [status, setStatus] = useState<'idle' | 'saving' | 'saved'>('idle');
	const [error, setError] = useState<string | null>(null);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		if (!session) {
			return;
		}
		setStatus('saving');
		setError(null);
		try {
			await apiFetch<{ user: User }>(`/api/v1/users/${session.user.id}`, {
				method: 'PUT',
				body: JSON.stringify({ name }),
			});
			setStatus('saved');
		} catch (caught) {
			setError(caught instanceof ApiError ? caught.message : 'Something went wrong.');
			setStatus('idle');
		}
	}

	return (
		<div className='space-y-6 py-6'>
			<Card className='space-y-4 p-6'>
				<h2 className='text-sm font-bold tracking-wide text-text-muted uppercase'>
					Your profile
				</h2>
				<form onSubmit={(event) => void handleSubmit(event)} className='space-y-4'>
					<Input
						value={name}
						onChange={(event) => {
							setName(event.target.value);
							setStatus('idle');
						}}
						placeholder='Name'
						required
					/>
					{error && <p className='text-sm text-error'>{error}</p>}
					<Button type='submit' disabled={status === 'saving'}>
						{status === 'saved' ? 'Saved!' : 'Save name'}
					</Button>
				</form>
			</Card>
		</div>
	);
}
