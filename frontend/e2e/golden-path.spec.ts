// The one golden-path E2E test this app has: host signs up, creates a
// room, a guest joins with no auth prompt, queues songs, the host
// auto-advances through them with zero manual intervention, and a guest
// can remove their own still-queued song. Search itself calls YouTube +
// Anthropic — this environment has no real keys for either, so that step
// is only checked for graceful degradation (a 503 message, not a crash);
// everything downstream of "a song is in the queue" is exercised by
// queueing directly through the API, the same way a real search result
// would.
import { test, expect } from '@playwright/test';
import { randomUUID } from 'node:crypto';

const BACKEND_URL = 'http://localhost:3000';

interface StoredRoomMemberSession {
	sessionToken: string;
}

test('host creates a room; a guest joins, queues songs, and the host auto-advances through them', async ({
	page,
	browser,
}) => {
	const email = `test-${randomUUID()}@example.com`;
	const password = 'a-reasonably-long-test-password';

	// --- Host: sign up and create a room ---
	await page.goto('/');
	await page.getByPlaceholder('Name').fill('Test Host');
	await page.getByPlaceholder('Email').fill(email);
	await page.getByPlaceholder('Password').fill(password);
	await page.getByRole('button', { name: 'Create account' }).click();
	await expect(page.getByText('Your profile')).toBeVisible();

	await page.getByText('Host a room').click();
	await expect(page.getByPlaceholder('Room name (optional)')).toBeVisible();
	await page.getByRole('button', { name: 'Create room' }).click();
	await page.waitForURL(/\/rooms\/[A-Z2-9]{6}\/host/);
	const code = page.url().match(/\/rooms\/([A-Z2-9]{6})\/host/)?.[1];
	expect(code).toMatch(/^[A-Z2-9]{6}$/);
	if (!code) {
		throw new Error('Failed to extract room code from host URL.');
	}

	// --- Guest: join from a separate browser context, no cookies or
	// localStorage shared with the host, same as two different phones.
	const guestContext = await browser.newContext();
	const guestPage = await guestContext.newPage();

	await guestPage.goto(`/join/${code}`);
	await expect(guestPage.getByPlaceholder('Your name')).toBeVisible();
	// A guest must never be asked to authenticate.
	await expect(guestPage.getByPlaceholder('Password')).toHaveCount(0);

	await guestPage.getByPlaceholder('Your name').fill('Test Guest');
	await guestPage.getByRole('button', { name: 'Join' }).click();
	await guestPage.waitForURL(`**/rooms/${code}`);
	await expect(guestPage.getByText('Joined as')).toBeVisible();

	// Search degrades gracefully without real YouTube/Anthropic keys.
	await guestPage
		.getByPlaceholder('Song title, artist, or lyrics')
		.fill('test song');
	await guestPage.getByRole('button', { name: 'Search' }).click();
	await expect(
		guestPage.getByText('Search is not available right now.'),
	).toBeVisible();

	const sessionToken = await guestPage.evaluate((roomCode: string) => {
		const raw = localStorage.getItem(`karaoke:room-member:${roomCode}`);
		if (!raw) {
			throw new Error('No stored room-member session.');
		}
		return (JSON.parse(raw) as StoredRoomMemberSession).sessionToken;
	}, code);

	async function queueSong(title: string, videoId: string) {
		const response = await guestPage.request.post(
			`${BACKEND_URL}/api/v1/rooms/${code}/queue`,
			{
				headers: { authorization: `Bearer ${sessionToken}` },
				data: {
					youtubeVideoId: videoId,
					title,
					channelTitle: 'Test Channel',
					thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/default.jpg`,
				},
			},
		);
		expect(response.ok()).toBe(true);
	}

	// --- First song: the host should auto-advance it with no manual
	// action, and the real YouTube IFrame Player should mount it.
	await queueSong('First Song', 'jNQXAC9IVRw');
	await expect(page.getByText('Now playing')).toBeVisible({
		timeout: 10000,
	});
	await expect(page.getByText('First Song')).toBeVisible();
	await expect(page.locator('iframe').first()).toHaveAttribute(
		'src',
		/jNQXAC9IVRw/,
		{ timeout: 10000 },
	);

	// --- Second song: added by the same guest, stays queued behind the
	// first, and the guest can remove it themselves.
	await queueSong('Second Song', 'dQw4w9WgXcQ');
	await expect(guestPage.getByText('Second Song')).toBeVisible({
		timeout: 8000,
	});
	await guestPage
		.locator('li', { hasText: 'Second Song' })
		.getByRole('button', { name: 'Remove' })
		.click();
	await expect(guestPage.getByText('Second Song')).toHaveCount(0, {
		timeout: 8000,
	});
});
