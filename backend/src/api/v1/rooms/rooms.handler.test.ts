import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../../app.ts';
import { prisma } from '../../../database/prismaClient.ts';

const hostEmail = `test-${randomUUID()}@example.com`;
const otherEmail = `test-${randomUUID()}@example.com`;
const password = 'a-reasonably-long-test-password';

interface RoomResponseBody {
	room: {
		id: string;
		code: string;
		name: string | null;
		hostId: string;
		aiSearchEnabled: boolean;
		appendKaraoke: boolean;
		status: 'OPEN' | 'CLOSED';
	};
}

function roomFrom(response: request.Response) {
	return (response.body as RoomResponseBody).room;
}

describe('/api/v1/rooms', () => {
	// two separate agents/users: one owns the room under test, the other's
	// just there to prove a non-host can't modify it
	const hostAgent = request.agent(app);
	const otherAgent = request.agent(app);
	let hostId: string;
	let otherId: string;

	beforeAll(async () => {
		const hostResponse = await hostAgent
			.post('/api/v1/authentication/sign-up/email')
			.send({ email: hostEmail, password, name: 'Host' });
		hostId = (hostResponse.body as { user: { id: string } }).user.id;

		const otherResponse = await otherAgent
			.post('/api/v1/authentication/sign-up/email')
			.send({ email: otherEmail, password, name: 'Other' });
		otherId = (otherResponse.body as { user: { id: string } }).user.id;
	});

	afterAll(async () => {
		await prisma.user.deleteMany({
			where: { id: { in: [hostId, otherId] } },
		});
		await prisma.$disconnect();
	});

	// A host can only have one OPEN room, so this closes whatever the previous test left open first.
	async function createRoom(name?: string) {
		const mine = await hostAgent.get('/api/v1/rooms/mine');
		const existing = (mine.body as { room: { code: string } | null }).room;
		if (existing) {
			await hostAgent
				.patch(`/api/v1/rooms/${existing.code}`)
				.send({ status: 'CLOSED' });
		}
		const response = await hostAgent
			.post('/api/v1/rooms')
			.send(name !== undefined ? { name } : {});
		return response;
	}

	test('rejects creating a room with no session', async () => {
		const response = await request(app).post('/api/v1/rooms').send({});
		expect(response.status).toBe(401);
	});

	test('lets a signed-in user create a room', async () => {
		const response = await createRoom();
		expect(response.status).toBe(201);

		const room = roomFrom(response);
		expect(room.hostId).toBe(hostId);
		expect(room.aiSearchEnabled).toBe(true);
		expect(room.appendKaraoke).toBe(true);
		expect(room.status).toBe('OPEN');
		expect(room.code).toMatch(/^[A-Z2-9]{6}$/);
	});

	test('rejects creating a second room while one is already open', async () => {
		const first = roomFrom(await createRoom());

		const second = await hostAgent.post('/api/v1/rooms').send({});
		expect(second.status).toBe(409);
		// the conflicting response hands back the still-open room so the
		// frontend can send the host straight to it
		expect((second.body as { room: { code: string } }).room.code).toBe(
			first.code,
		);
	});

	test("GET /rooms/mine returns the host's open room, or null", async () => {
		const created = roomFrom(await createRoom());

		const mine = await hostAgent.get('/api/v1/rooms/mine');
		expect(mine.status).toBe(200);
		expect(
			(mine.body as { room: { code: string } | null }).room?.code,
		).toBe(created.code);

		await hostAgent
			.patch(`/api/v1/rooms/${created.code}`)
			.send({ status: 'CLOSED' });

		const mineAfterClose = await hostAgent.get('/api/v1/rooms/mine');
		expect(mineAfterClose.status).toBe(200);
		expect(
			(mineAfterClose.body as { room: { code: string } | null }).room,
		).toBeNull();
	});

	test('rejects GET /rooms/mine with no session', async () => {
		const response = await request(app).get('/api/v1/rooms/mine');
		expect(response.status).toBe(401);
	});

	test('returns 404 for a code that does not exist', async () => {
		const response = await request(app).get('/api/v1/rooms/NOTFND');
		expect(response.status).toBe(404);
	});

	test('lets anyone look up a room by code, no session required', async () => {
		const created = roomFrom(await createRoom('Friday Night'));

		const response = await request(app).get(
			`/api/v1/rooms/${created.code}`,
		);
		expect(response.status).toBe(200);
		expect(roomFrom(response).name).toBe('Friday Night');
	});

	test('rejects updating a room with no session', async () => {
		const created = roomFrom(await createRoom());

		const response = await request(app)
			.patch(`/api/v1/rooms/${created.code}`)
			.send({ aiSearchEnabled: false });
		expect(response.status).toBe(401);
	});

	test("rejects a signed-in user updating someone else's room", async () => {
		const created = roomFrom(await createRoom());

		const response = await otherAgent
			.patch(`/api/v1/rooms/${created.code}`)
			.send({ aiSearchEnabled: false });
		expect(response.status).toBe(403);
	});

	test('lets the host close the room', async () => {
		const created = roomFrom(await createRoom());

		const closed = await hostAgent
			.patch(`/api/v1/rooms/${created.code}`)
			.send({ status: 'CLOSED' });
		expect(closed.status).toBe(200);
		expect(roomFrom(closed).status).toBe('CLOSED');
	});

	test('lets the host toggle aiSearchEnabled and appendKaraoke', async () => {
		const created = roomFrom(await createRoom());

		const toggled = await hostAgent
			.patch(`/api/v1/rooms/${created.code}`)
			.send({ aiSearchEnabled: false, appendKaraoke: false });
		expect(toggled.status).toBe(200);
		expect(roomFrom(toggled).aiSearchEnabled).toBe(false);
		expect(roomFrom(toggled).appendKaraoke).toBe(false);
	});

	test('rejects an update with an invalid body', async () => {
		const created = roomFrom(await createRoom());

		const response = await hostAgent
			.patch(`/api/v1/rooms/${created.code}`)
			.send({ status: 'DELETED' });
		expect(response.status).toBe(400);
	});
});
