// Unlike other integration tests here, this mocks youtube.ts/llm.ts instead of hitting them for real, so CI
// needs no API keys. jest.unstable_mockModule requires dynamic import()s below, not static ones.
import {
	jest,
	describe,
	test,
	expect,
	beforeAll,
	afterAll,
	afterEach,
} from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import type { YoutubeCandidate } from '../../../lib/youtube.ts';

const searchYoutube = jest.fn<(query: string) => Promise<YoutubeCandidate[]>>();
const rankCandidates =
	jest.fn<
		(
			query: string,
			candidates: YoutubeCandidate[],
			limit: number,
		) => Promise<YoutubeCandidate[]>
	>();

jest.unstable_mockModule('../../../lib/youtube.ts', () => ({ searchYoutube }));
jest.unstable_mockModule('../../../lib/llm.ts', () => ({ rankCandidates }));

const { default: app } = await import('../../../app.ts');
const { prisma } = await import('../../../database/prismaClient.ts');
const { default: ServiceNotConfiguredError } =
	await import('../../../lib/serviceNotConfiguredError.ts');

const hostEmail = `test-${randomUUID()}@example.com`;
const password = 'a-reasonably-long-test-password';

const fakeCandidates: YoutubeCandidate[] = [
	{
		videoId: 'abc123',
		title: 'Fake Song (Official Video)',
		channelTitle: 'Fake Channel',
		thumbnailUrl: 'https://example.com/thumb.jpg',
		viewCount: 1000,
	},
];

interface RoomResponseBody {
	room: { code: string };
}

interface JoinResponseBody {
	sessionToken: string;
}

describe('/api/v1/rooms/:code/search', () => {
	const hostAgent = request.agent(app);
	let hostId: string;

	beforeAll(async () => {
		const hostResponse = await hostAgent
			.post('/api/v1/authentication/sign-up/email')
			.send({ email: hostEmail, password, name: 'Host' });
		hostId = (hostResponse.body as { user: { id: string } }).user.id;
	});

	afterAll(async () => {
		await prisma.user.delete({ where: { id: hostId } });
		await prisma.$disconnect();
	});

	afterEach(() => {
		searchYoutube.mockReset();
		rankCandidates.mockReset();
	});

	async function createRoom() {
		const response = await hostAgent.post('/api/v1/rooms').send({});
		return (response.body as RoomResponseBody).room;
	}

	async function joinRoom(code: string) {
		const response = await request(app)
			.post(`/api/v1/rooms/${code}/join`)
			.send({ displayName: 'Guest' });
		return (response.body as JoinResponseBody).sessionToken;
	}

	test('rejects a search with no room-member token', async () => {
		const room = await createRoom();
		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/search`)
			.send({ query: 'test' });
		expect(response.status).toBe(401);
	});

	test('returns 404 for a code that does not exist', async () => {
		const token = await joinRoom((await createRoom()).code);
		const response = await request(app)
			.post('/api/v1/rooms/NOTFND/search')
			.set('Authorization', `Bearer ${token}`)
			.send({ query: 'test' });
		expect(response.status).toBe(404);
	});

	test('rejects a token from a different room', async () => {
		const roomA = await createRoom();
		const roomB = await createRoom();
		const tokenForA = await joinRoom(roomA.code);

		const response = await request(app)
			.post(`/api/v1/rooms/${roomB.code}/search`)
			.set('Authorization', `Bearer ${tokenForA}`)
			.send({ query: 'test' });
		expect(response.status).toBe(403);
	});

	test('rejects a search in a closed room', async () => {
		const room = await createRoom();
		const token = await joinRoom(room.code);
		await hostAgent
			.patch(`/api/v1/rooms/${room.code}`)
			.send({ status: 'CLOSED' });

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/search`)
			.set('Authorization', `Bearer ${token}`)
			.send({ query: 'test' });
		expect(response.status).toBe(403);
	});

	test('rejects an invalid body', async () => {
		const room = await createRoom();
		const token = await joinRoom(room.code);

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/search`)
			.set('Authorization', `Bearer ${token}`)
			.send({ query: '' });
		expect(response.status).toBe(400);
	});

	test('returns 503 when the search services are not configured', async () => {
		const room = await createRoom();
		const token = await joinRoom(room.code);
		searchYoutube.mockRejectedValue(
			new ServiceNotConfiguredError('YOUTUBE_API_KEY is not configured.'),
		);

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/search`)
			.set('Authorization', `Bearer ${token}`)
			.send({ query: 'test' });
		expect(response.status).toBe(503);
	});

	test('requests a single top match when autoSelect is on', async () => {
		const room = await createRoom();
		const token = await joinRoom(room.code);
		await hostAgent
			.patch(`/api/v1/rooms/${room.code}`)
			.send({ autoSelect: true });

		searchYoutube.mockResolvedValue(fakeCandidates);
		rankCandidates.mockResolvedValue(fakeCandidates.slice(0, 1));

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/search`)
			.set('Authorization', `Bearer ${token}`)
			.send({ query: 'fake song' });

		expect(response.status).toBe(200);
		const body = response.body as {
			results: YoutubeCandidate[];
			autoSelect: boolean;
		};
		expect(body.autoSelect).toBe(true);
		expect(body.results).toHaveLength(1);
		expect(rankCandidates).toHaveBeenCalledWith(
			'fake song',
			fakeCandidates,
			1,
		);
	});

	test('requests up to 5 ranked matches when autoSelect is off', async () => {
		const room = await createRoom();
		const token = await joinRoom(room.code);

		searchYoutube.mockResolvedValue(fakeCandidates);
		rankCandidates.mockResolvedValue(fakeCandidates);

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/search`)
			.set('Authorization', `Bearer ${token}`)
			.send({ query: 'fake song' });

		expect(response.status).toBe(200);
		const body = response.body as { autoSelect: boolean };
		expect(body.autoSelect).toBe(false);
		expect(rankCandidates).toHaveBeenCalledWith(
			'fake song',
			fakeCandidates,
			5,
		);
	});
});
