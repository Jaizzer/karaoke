// Public: where a guest lands with no room code yet, typed in or redirected here after their room closed.
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import Card from '../components/Card.tsx';
import Input from '../components/Input.tsx';
import Button from '../components/Button.tsx';

export default function JoinLandingPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const [code, setCode] = useState('');
	const notice = (location.state as { notice?: string } | null)?.notice;

	function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		const trimmed = code.trim();
		if (trimmed) {
			navigate(`/join/${trimmed.toUpperCase()}`);
		}
	}

	return (
		<div className='flex min-h-screen items-center justify-center px-4'>
			<Card className='w-full max-w-sm space-y-4 p-6'>
				<h1 className='text-center text-2xl font-bold text-text'>
					Join a room
				</h1>
				{notice && (
					<p className='text-center text-sm text-text-muted'>
						{notice}
					</p>
				)}
				<form onSubmit={handleSubmit} className='space-y-4'>
					<Input
						value={code}
						onChange={(event) => setCode(event.target.value)}
						placeholder='Room code'
						required
						className='text-center font-mono tracking-widest uppercase'
					/>
					<Button type='submit' className='w-full'>
						Join
					</Button>
				</form>
				<p className='text-center text-sm text-text-muted'>
					Or scan the QR code the host is showing.
				</p>
			</Card>
		</div>
	);
}
