// AuthenticatedLayout gates host-facing routes behind a signed-in session; /join/:code and /rooms/:code stay
// public. Routes stay flat in one tree since a nested <Routes> would let /rooms/:code swallow /rooms/new first.
import { useEffect, useState } from 'react';
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	Link,
	Outlet,
	useLocation,
} from 'react-router';
import { authClient, useSession } from './lib/authClient.ts';
import { apiFetch } from './lib/api.ts';
import AuthPanel from './features/auth/AuthPanel.tsx';
import EmailVerificationBanner from './features/auth/EmailVerificationBanner.tsx';
import HomePage from './pages/HomePage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import RoomCreatePage from './pages/RoomCreatePage.tsx';
import HostDisplayPage from './pages/HostDisplayPage.tsx';
import JoinPage from './pages/JoinPage.tsx';
import JoinLandingPage from './pages/JoinLandingPage.tsx';
import MemberRoomPage from './pages/MemberRoomPage.tsx';
import Button from './components/Button.tsx';
import AuthHero from './components/AuthHero.tsx';
import Overlay from './components/Overlay.tsx';

interface MyRoom {
	code: string;
}

// signed out -> just the auth panel. signed in -> persistent header + <Outlet/>.
function AuthenticatedLayout() {
	const { data: session, isPending } = useSession();
	const location = useLocation();

	// A host can only run one room at a time; this decides whether the header shows "Host a room" or links back
	// into it. Re-fetched on every navigation, not just session changes, since this layout persists across routes.
	const [myRoom, setMyRoom] = useState<MyRoom | null>(null);
	const [showAccountMenu, setShowAccountMenu] = useState(false);
	useEffect(() => {
		if (!session) {
			return;
		}
		apiFetch<{ room: MyRoom | null }>('/api/v1/rooms/mine')
			.then(({ room }) => {
				setMyRoom(room);
			})
			.catch(() => {
				// worst case the header just offers "Host a room" and the
				// create-room page itself still enforces the one-room rule.
			});
	}, [session, location.pathname]);

	if (!session) {
		return (
			<main className='relative flex min-h-screen items-center justify-center overflow-hidden px-4'>
				<AuthHero />
				<div className='w-full max-w-sm space-y-6'>
					<h1 className='text-center text-2xl font-bold text-text'>
						Karaoke
					</h1>
					{isPending ? (
						<p className='text-center text-sm text-text-muted'>
							Loading…
						</p>
					) : (
						<AuthPanel />
					)}
				</div>
			</main>
		);
	}

	return (
		<div className='mx-auto max-w-3xl px-4'>
			<header className='flex items-center justify-between border-b border-border-muted py-4'>
				<div className='flex items-center gap-4'>
					<Link to='/' className='text-lg font-bold text-text'>
						Karaoke
					</Link>
					{myRoom ? (
						<Link
							to={`/rooms/${myRoom.code}/host`}
							className='text-sm text-text-muted hover:text-text'
						>
							Your room: {myRoom.code}
						</Link>
					) : (
						<Link
							to='/rooms/new'
							className='text-sm text-text-muted hover:text-text'
						>
							Host a room
						</Link>
					)}
				</div>
				{/* full email + sign out from sm: up; below that they collapse into a
				single account icon to save header space. */}
				<div className='hidden items-center gap-3 text-sm sm:flex'>
					<span className='text-text-muted'>
						{session.user.email}
					</span>
					<Button
						type='button'
						variant='ghost'
						onClick={() => void authClient.signOut()}
						className='px-3 py-1.5 text-xs'
					>
						Sign out
					</Button>
				</div>

				<button
					type='button'
					aria-label='Account'
					onClick={() => {
						setShowAccountMenu(true);
					}}
					className='flex h-9 w-9 items-center justify-center rounded-full border border-border bg-transparent text-text-muted transition-colors hover:border-accent hover:text-text sm:hidden'
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
						<circle cx='12' cy='8' r='4' />
						<path d='M4 20c0-4.4 3.6-8 8-8s8 3.6 8 8' />
					</svg>
				</button>
			</header>

			{showAccountMenu && (
				<Overlay
					onClose={() => {
						setShowAccountMenu(false);
					}}
				>
					<h2 className='text-lg font-bold text-text'>Account</h2>
					<p className='text-sm text-text-muted'>
						{session.user.email}
					</p>
					<Button
						type='button'
						variant='ghost'
						onClick={() => void authClient.signOut()}
					>
						Sign out
					</Button>
				</Overlay>
			)}

			{!session.user.emailVerified && (
				<div className='pt-4'>
					<EmailVerificationBanner email={session.user.email} />
				</div>
			)}

			<Outlet />
		</div>
	);
}

export default function App() {
	return (
		<BrowserRouter>
			<Routes>
				<Route path='/reset-password' element={<ResetPasswordPage />} />
				<Route path='/join' element={<JoinLandingPage />} />
				<Route path='/join/:code' element={<JoinPage />} />
				<Route path='/rooms/:code' element={<MemberRoomPage />} />

				<Route element={<AuthenticatedLayout />}>
					<Route path='/' element={<HomePage />} />
					<Route path='/rooms/new' element={<RoomCreatePage />} />
					<Route
						path='/rooms/:code/host'
						element={<HostDisplayPage />}
					/>
				</Route>

				<Route path='*' element={<Navigate to='/' replace />} />
			</Routes>
		</BrowserRouter>
	);
}
