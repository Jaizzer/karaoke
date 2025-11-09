// AuthenticatedLayout gates host-facing routes behind a signed-in session; /join/:code and /rooms/:code stay
// public. Routes stay flat in one tree since a nested <Routes> would let /rooms/:code swallow /rooms/new first.
import {
	BrowserRouter,
	Routes,
	Route,
	Navigate,
	Link,
	Outlet,
} from 'react-router';
import { authClient, useSession } from './lib/authClient.ts';
import AuthPanel from './features/auth/AuthPanel.tsx';
import EmailVerificationBanner from './features/auth/EmailVerificationBanner.tsx';
import HomePage from './pages/HomePage.tsx';
import ResetPasswordPage from './pages/ResetPasswordPage.tsx';
import RoomCreatePage from './pages/RoomCreatePage.tsx';
import HostDisplayPage from './pages/HostDisplayPage.tsx';
import JoinPage from './pages/JoinPage.tsx';
import MemberRoomPage from './pages/MemberRoomPage.tsx';
import Button from './components/Button.tsx';
import AuthHero from './components/AuthHero.tsx';

// signed out -> just the auth panel. signed in -> persistent header + <Outlet/>.
function AuthenticatedLayout() {
	const { data: session, isPending } = useSession();

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
					<Link
						to='/rooms/new'
						className='text-sm text-text-muted hover:text-text'
					>
						Host a room
					</Link>
				</div>
				<div className='flex items-center gap-3 text-sm'>
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
			</header>

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
