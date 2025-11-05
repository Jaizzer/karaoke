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
		autoSelect: boolean;
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

	test('rejects creating a room with no session', async () => {
		const response = await request(app).post('/api/v1/rooms').send({});
		expect(response.status).toBe(401);
	});

	test('lets a signed-in user create a room', async () => {
		const response = await hostAgent.post('/api/v1/rooms').send({});
		expect(response.status).toBe(201);

		const room = roomFrom(response);
		expect(room.hostId).toBe(hostId);
		expect(room.autoSelect).toBe(false);
		expect(room.status).toBe('OPEN');
		expect(room.code).toMatch(/^[A-Z2-9]{6}$/);
	});

	test('returns 404 for a code that does not exist', async () => {
		const response = await request(app).get('/api/v1/rooms/NOTFND');
		expect(response.status).toBe(404);
	});

	test('lets anyone look up a room by code, no session required', async () => {
		const created = await hostAgent
			.post('/api/v1/rooms')
			.send({ name: 'Friday Night' });
		const code = roomFrom(created).code;

		const response = await request(app).get(`/api/v1/rooms/${code}`);
		expect(response.status).toBe(200);
		expect(roomFrom(response).name).toBe('Friday Night');
	});

	test('rejects updating a room with no session', async () => {
		const created = await hostAgent.post('/api/v1/rooms').send({});
		const code = roomFrom(created).code;

		const response = await request(app)
			.patch(`/api/v1/rooms/${code}`)
			.send({ autoSelect: true });
		expect(response.status).toBe(401);
	});

	test("rejects a signed-in user updating someone else's room", async () => {
		const created = await hostAgent.post('/api/v1/rooms').send({});
		const code = roomFrom(created).code;

		const response = await otherAgent
			.patch(`/api/v1/rooms/${code}`)
			.send({ autoSelect: true });
		expect(response.status).toBe(403);
	});

	test('lets the host toggle autoSelect and close the room', async () => {
		const created = await hostAgent.post('/api/v1/rooms').send({});
		const code = roomFrom(created).code;

		const toggled = await hostAgent
			.patch(`/api/v1/rooms/${code}`)
			.send({ autoSelect: true });
		expect(toggled.status).toBe(200);
		expect(roomFrom(toggled).autoSelect).toBe(true);

		const closed = await hostAgent
			.patch(`/api/v1/rooms/${code}`)
			.send({ status: 'CLOSED' });
		expect(closed.status).toBe(200);
		expect(roomFrom(closed).status).toBe('CLOSED');
	});

	test('rejects an update with an invalid body', async () => {
		const created = await hostAgent.post('/api/v1/rooms').send({});
		const code = roomFrom(created).code;

		const response = await hostAgent
			.patch(`/api/v1/rooms/${code}`)
			.send({ status: 'DELETED' });
		expect(response.status).toBe(400);
	});
});
