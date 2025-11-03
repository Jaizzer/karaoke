// Landed on from the password-reset email link; only ever reachable while signed out (see App.tsx). Renders
// just the card content, no page shell, since App.tsx supplies the shared landing chrome AuthPanel also sits inside.
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { authClient } from '../lib/authClient.ts';
import Card from '../components/Card.tsx';
import Button from '../components/Button.tsx';
import Input from '../components/Input.tsx';

export default function ResetPasswordPage() {
	const [searchParams] = useSearchParams();
	const token = searchParams.get('token');
	const [newPassword, setNewPassword] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [succeeded, setSucceeded] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		if (!token) {
			return;
		}
		const result = await authClient.resetPassword({ newPassword, token });
		if (result.error) {
			setError(result.error.message ?? 'Something went wrong.');
			return;
		}
		setSucceeded(true);
	}

	if (!token) {
		return (
			<Card className='space-y-4 p-6 text-center'>
				<p className='text-sm text-text'>
					This reset link is invalid or has expired.
				</p>
				<Link to='/' className='text-sm text-accent hover:underline'>
					Back to sign in
				</Link>
			</Card>
		);
	}

	if (succeeded) {
		return (
			<Card className='space-y-4 p-6 text-center'>
				<p className='text-sm text-text'>
					Your password has been reset.
				</p>
				<Link to='/' className='text-sm text-accent hover:underline'>
					Sign in
				</Link>
			</Card>
		);
	}

	return (
		<Card className='p-6'>
			<form
				onSubmit={(event) => void handleSubmit(event)}
				className='space-y-4'
			>
				<Input
					type='password'
					value={newPassword}
					onChange={(event) => {
						setNewPassword(event.target.value);
					}}
					placeholder='New password'
					minLength={8}
					required
				/>
				{error && <p className='text-sm text-error'>{error}</p>}
				<Button type='submit' className='w-full'>
					Set new password
				</Button>
			</form>
		</Card>
	);
}
