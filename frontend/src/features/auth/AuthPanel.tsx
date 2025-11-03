// Sign-up/in/forgot-password against Better Auth; only rendered by App.tsx's auth gate when there's no session.
import { useState } from 'react';
import { authClient } from '../../lib/authClient.ts';
import Card from '../../components/Card.tsx';
import Button from '../../components/Button.tsx';
import Input from '../../components/Input.tsx';

type Mode = 'sign-in' | 'sign-up' | 'forgot-password';

export default function AuthPanel() {
	const [mode, setMode] = useState<Mode>('sign-up');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [name, setName] = useState('');
	const [error, setError] = useState<string | null>(null);
	const [resetRequested, setResetRequested] = useState(false);

	async function handleSubmit(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		const result =
			mode === 'sign-up'
				? await authClient.signUp.email({ email, password, name })
				: await authClient.signIn.email({ email, password });

		if (result.error) {
			setError(result.error.message ?? 'Something went wrong.');
		}
	}

	async function handleRequestReset(event: React.FormEvent) {
		event.preventDefault();
		setError(null);

		// Better Auth doesn't leak whether the address exists, so the message stays neutral either way. redirectTo
		// must be absolute since the backend builds the emailed link against its own baseURL, not the frontend's origin.
		const result = await authClient.requestPasswordReset({
			email,
			redirectTo: `${window.location.origin}/reset-password`,
		});

		if (result.error) {
			setError(result.error.message ?? 'Something went wrong.');
			return;
		}
		setResetRequested(true);
	}

	if (mode === 'forgot-password') {
		return (
			<Card className='p-6'>
				{resetRequested ? (
					<div className='space-y-4 text-center'>
						<p className='text-sm text-text'>
							If that email exists, check your inbox for a reset
							link.
						</p>
						<Button
							type='button'
							variant='ghost'
							className='w-full'
							onClick={() => {
								setMode('sign-in');
								setResetRequested(false);
							}}
						>
							Back to sign in
						</Button>
					</div>
				) : (
					<form
						onSubmit={(event) => void handleRequestReset(event)}
						className='space-y-4'
					>
						<p className='text-sm text-text-muted'>
							Enter your email and we'll send you a link to reset
							your password.
						</p>
						<Input
							type='email'
							value={email}
							onChange={(event) => {
								setEmail(event.target.value);
							}}
							placeholder='Email'
							required
						/>
						{error && <p className='text-sm text-error'>{error}</p>}
						<Button type='submit' className='w-full'>
							Send reset link
						</Button>
						<button
							type='button'
							onClick={() => {
								setMode('sign-in');
							}}
							className='w-full text-center text-sm text-text-muted hover:text-text'
						>
							Back to sign in
						</button>
					</form>
				)}
			</Card>
		);
	}

	return (
		<Card className='p-6'>
			<form
				onSubmit={(event) => void handleSubmit(event)}
				className='space-y-4'
			>
				<div className='flex gap-1 rounded-md bg-bg p-1 text-sm'>
					<button
						type='button'
						onClick={() => {
							setMode('sign-up');
						}}
						className={`flex-1 rounded px-3 py-1.5 font-semibold transition-colors ${
							mode === 'sign-up'
								? 'bg-surface-hover text-text'
								: 'text-text-muted hover:text-text'
						}`}
					>
						Sign up
					</button>
					<button
						type='button'
						onClick={() => {
							setMode('sign-in');
						}}
						className={`flex-1 rounded px-3 py-1.5 font-semibold transition-colors ${
							mode === 'sign-in'
								? 'bg-surface-hover text-text'
								: 'text-text-muted hover:text-text'
						}`}
					>
						Sign in
					</button>
				</div>

				{mode === 'sign-up' && (
					<Input
						value={name}
						onChange={(event) => {
							setName(event.target.value);
						}}
						placeholder='Name'
						required
					/>
				)}
				<Input
					type='email'
					value={email}
					onChange={(event) => {
						setEmail(event.target.value);
					}}
					placeholder='Email'
					required
				/>
				<Input
					type='password'
					value={password}
					onChange={(event) => {
						setPassword(event.target.value);
					}}
					placeholder='Password'
					minLength={8}
					required
				/>

				{mode === 'sign-in' && (
					<button
						type='button'
						onClick={() => {
							setError(null);
							setMode('forgot-password');
						}}
						className='text-sm text-accent hover:underline'
					>
						Forgot password?
					</button>
				)}

				{error && <p className='text-sm text-error'>{error}</p>}

				<Button type='submit' className='w-full'>
					{mode === 'sign-up' ? 'Create account' : 'Sign in'}
				</Button>
			</form>
		</Card>
	);
}
