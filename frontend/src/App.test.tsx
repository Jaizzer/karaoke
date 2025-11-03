// A smoke test, not integration: stubs fetch so it only proves the component tree renders without blowing up.
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App.tsx';

beforeEach(() => {
	vi.stubGlobal(
		'fetch',
		vi.fn((url: string) => {
			// useSession checks this endpoint on mount; returning "no session" here
			// is what gets the sign-up/sign-in form (not the profile view) to render.
			if (url.includes('get-session')) {
				return Promise.resolve({
					ok: true,
					json: () => Promise.resolve(null),
				});
			}
			return Promise.resolve({
				ok: true,
				json: () => Promise.resolve({ status: 'ok' }),
			});
		}),
	);
});

describe('App', () => {
	test('renders the page heading and the sign-up form', async () => {
		render(<App />);

		expect(
			screen.getByRole('heading', { name: 'Karaoke' }),
		).toBeInTheDocument();
		expect(await screen.findByPlaceholderText('Email')).toBeInTheDocument();
	});
});
