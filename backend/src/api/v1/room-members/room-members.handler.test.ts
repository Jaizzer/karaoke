import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../../app.ts';
import { prisma } from '../../../database/prismaClient.ts';

const hostEmail = `test-${randomUUID()}@example.com`;
const password = 'a-reasonably-long-test-password';

interface RoomResponseBody {
	room: { code: string };
}

interface JoinResponseBody {
	member: { id: string; roomId: string; displayName: string };
	sessionToken: string;
}

describe('/api/v1/rooms/:code/join', () => {
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

	// A host can only have one OPEN room (rooms.handler.ts), so this closes whatever's already open first.
	async function createRoom() {
		const mine = await hostAgent.get('/api/v1/rooms/mine');
		const existing = (mine.body as { room: { code: string } | null }).room;
		if (existing) {
			await hostAgent
				.patch(`/api/v1/rooms/${existing.code}`)
				.send({ status: 'CLOSED' });
		}
		const response = await hostAgent.post('/api/v1/rooms').send({});
		return (response.body as RoomResponseBody).room;
	}

	test('returns 404 for a code that does not exist', async () => {
		const response = await request(app)
			.post('/api/v1/rooms/NOTFND/join')
			.send({ displayName: 'Guest' });
		expect(response.status).toBe(404);
	});

	test('rejects an invalid body', async () => {
		const room = await createRoom();
		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/join`)
			.send({ displayName: '' });
		expect(response.status).toBe(400);
	});

	test('lets an unauthenticated guest join an open room', async () => {
		const room = await createRoom();
		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/join`)
			.send({ displayName: 'Guest' });

		expect(response.status).toBe(201);
		const body = response.body as JoinResponseBody;
		expect(body.member.displayName).toBe('Guest');
		expect(body.member.roomId).toBeTruthy();
		// 32 random bytes, hex-encoded.
		expect(body.sessionToken).toMatch(/^[0-9a-f]{64}$/);
	});

	test('rejects joining a closed room', async () => {
		const room = await createRoom();
		await hostAgent
			.patch(`/api/v1/rooms/${room.code}`)
			.send({ status: 'CLOSED' });

		const response = await request(app)
			.post(`/api/v1/rooms/${room.code}/join`)
			.send({ displayName: 'Guest' });
		expect(response.status).toBe(403);
	});
});
