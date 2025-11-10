import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../../app.ts';
import { prisma } from '../../../database/prismaClient.ts';

const hostEmail = `test-${randomUUID()}@example.com`;
const password = 'a-reasonably-long-test-password';

const sampleSong = {
	youtubeVideoId: 'abc123',
	title: 'Fake Song (Official Video)',
	channelTitle: 'Fake Channel',
	thumbnailUrl: 'https://example.com/thumb.jpg',
};

interface RoomResponseBody {
	room: { code: string };
}

interface JoinResponseBody {
	member: { id: string };
	sessionToken: string;
}

interface QueueItemResponseBody {
	queueItem: { id: string; status: string };
}

interface QueueListResponseBody {
	queueItems: { id: string; status: string }[];
}

describe('/api/v1/rooms/:code/queue', () => {
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

	async function createRoom() {
		const response = await hostAgent.post('/api/v1/rooms').send({});
		return (response.body as RoomResponseBody).room;
	}

	async function joinRoom(code: string) {
		const response = await request(app)
			.post(`/api/v1/rooms/${code}/join`)
			.send({ displayName: 'Guest' });
		return response.body as JoinResponseBody;
	}

	async function addSong(code: string, token: string) {
		const response = await request(app)
			.post(`/api/v1/rooms/${code}/queue`)
			.set('Authorization', `Bearer ${token}`)
			.send(sampleSong);
		return (response.body as QueueItemResponseBody).queueItem;
	}

	test('starts empty and is readable without any auth', async () => {
		const room = await createRoom();
		const response = await request(app).get(
			`/api/v1/rooms/${room.code}/queue`,
		);
		expect(response.status).toBe(200);
		expect((response.body as QueueListResponseBody).queueItems).toEqual([]);
	});

	test('rejects adding a song with no room-member token', async () => {
		const room = await createRoom();
		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/queue`)
			.send(sampleSong);
		expect(response.status).toBe(401);
	});

	test('rejects a token from a different room', async () => {
		const roomA = await createRoom();
		const roomB = await createRoom();
		const { sessionToken } = await joinRoom(roomA.code);

		const response = await request(app)
			.post(`/api/v1/rooms/${roomB.code}/queue`)
			.set('Authorization', `Bearer ${sessionToken}`)
			.send(sampleSong);
		expect(response.status).toBe(403);
	});

	test('rejects adding a song to a closed room', async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);
		await hostAgent
			.patch(`/api/v1/rooms/${room.code}`)
			.send({ status: 'CLOSED' });

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/queue`)
			.set('Authorization', `Bearer ${sessionToken}`)
			.send(sampleSong);
		expect(response.status).toBe(403);
	});

	test('rejects an invalid body', async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/queue`)
			.set('Authorization', `Bearer ${sessionToken}`)
			.send({ ...sampleSong, thumbnailUrl: 'not-a-url' });
		expect(response.status).toBe(400);
	});

	test('lets a member add a song, and it shows up in the queue', async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);

		const created = await addSong(room.code, sessionToken);
		expect(created.status).toBe('QUEUED');

		const list = await request(app).get(`/api/v1/rooms/${room.code}/queue`);
		expect(
			(list.body as QueueListResponseBody).queueItems.map(
				(item) => item.id,
			),
		).toContain(created.id);
	});

	test('returns 404 removing a queue item that does not exist', async () => {
		const room = await createRoom();
		const response = await hostAgent.delete(
			`/api/v1/rooms/${room.code}/queue/${randomUUID()}`,
		);
		expect(response.status).toBe(404);
	});

	test("rejects a member removing someone else's song", async () => {
		const room = await createRoom();
		const adder = await joinRoom(room.code);
		const other = await joinRoom(room.code);
		const item = await addSong(room.code, adder.sessionToken);

		const response = await request(app)
			.delete(`/api/v1/rooms/${room.code}/queue/${item.id}`)
			.set('Authorization', `Bearer ${other.sessionToken}`);
		expect(response.status).toBe(403);
	});

	test('lets a member remove their own song', async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);
		const item = await addSong(room.code, sessionToken);

		const response = await request(app)
			.delete(`/api/v1/rooms/${room.code}/queue/${item.id}`)
			.set('Authorization', `Bearer ${sessionToken}`);
		expect(response.status).toBe(204);

		const list = await request(app).get(`/api/v1/rooms/${room.code}/queue`);
		expect(
			(list.body as QueueListResponseBody).queueItems.map((i) => i.id),
		).not.toContain(item.id);
	});

	test("lets the host remove a guest's song", async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);
		const item = await addSong(room.code, sessionToken);

		const response = await hostAgent.delete(
			`/api/v1/rooms/${room.code}/queue/${item.id}`,
		);
		expect(response.status).toBe(204);
	});

	test('rejects start/finish with no host session', async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);
		const item = await addSong(room.code, sessionToken);

		const start = await request(app).post(
			`/api/v1/rooms/${room.code}/queue/${item.id}/start`,
		);
		expect(start.status).toBe(401);
	});

	test('rejects start/finish from a non-host', async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);
		const item = await addSong(room.code, sessionToken);

		const otherHostAgent = request.agent(app);
		const otherEmail = `test-${randomUUID()}@example.com`;
		const signUp = await otherHostAgent
			.post('/api/v1/authentication/sign-up/email')
			.send({ email: otherEmail, password, name: 'Other Host' });
		const otherId = (signUp.body as { user: { id: string } }).user.id;

		const response = await otherHostAgent.post(
			`/api/v1/rooms/${room.code}/queue/${item.id}/start`,
		);
		expect(response.status).toBe(403);

		await prisma.user.delete({ where: { id: otherId } });
	});

	test('lets the host start then finish a song', async () => {
		const room = await createRoom();
		const { sessionToken } = await joinRoom(room.code);
		const item = await addSong(room.code, sessionToken);

		const started = await hostAgent.post(
			`/api/v1/rooms/${room.code}/queue/${item.id}/start`,
		);
		expect(started.status).toBe(200);
		expect((started.body as QueueItemResponseBody).queueItem.status).toBe(
			'PLAYING',
		);

		const finished = await hostAgent.post(
			`/api/v1/rooms/${room.code}/queue/${item.id}/finish`,
		);
		expect(finished.status).toBe(200);
		expect((finished.body as QueueItemResponseBody).queueItem.status).toBe(
			'PLAYED',
		);

		// PLAYED items drop out of the poll target.
		const list = await request(app).get(`/api/v1/rooms/${room.code}/queue`);
		expect(
			(list.body as QueueListResponseBody).queueItems.map((i) => i.id),
		).not.toContain(item.id);
	});
});
