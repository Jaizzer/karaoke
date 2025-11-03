// An integration test, not a unit test: real requests through the real app against the real test database,
// no mocking, since the interesting behavior lives in the seams between Express, Better Auth, and Prisma.
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import app from '../../../app.ts';
import { prisma } from '../../../database/prismaClient.ts';

// Fresh, guaranteed-unique email per run since User.email is unique in the schema.
const email = `test-${randomUUID()}@example.com`;
const password = 'a-reasonably-long-test-password';

// supertest types response.body as any; this narrows it back to something typed in one place instead of at every call site.
interface UserResponseBody {
	user: { id: string; email: string; name: string | null };
}

function userFrom(response: request.Response) {
	return (response.body as UserResponseBody).user;
}

describe('/api/v1/users/:id', () => {
	// request.agent(app), unlike plain request(app), persists cookies across calls the same way a browser would.
	const signedInAgent = request.agent(app);
	let userId: string;

	// runs once before any test in this file, sign-up doubles as both the
	// setup step and an implicit test that the auth route itself works
	beforeAll(async () => {
		const response = await signedInAgent
			.post('/api/v1/authentication/sign-up/email')
			.send({ email, password, name: 'Test User' });

		expect(response.status).toBe(200);
		userId = userFrom(response).id;
	});

	afterAll(async () => {
		// cascading delete (see schema.prisma's onDelete: Cascade) removes
		// the Session/Account rows this user picked up along the way too
		await prisma.user.delete({ where: { id: userId } });
		await prisma.$disconnect();
	});

	test('rejects a request with no session', async () => {
		const response = await request(app).get(`/api/v1/users/${userId}`);
		expect(response.status).toBe(401);
	});

	test("rejects a signed-in user reading someone else's id", async () => {
		const response = await signedInAgent.get(
			`/api/v1/users/${randomUUID()}`,
		);
		expect(response.status).toBe(403);
	});

	test('returns the signed-in user their own profile', async () => {
		const response = await signedInAgent.get(`/api/v1/users/${userId}`);
		expect(response.status).toBe(200);
		expect(userFrom(response).email).toBe(email);
	});

	test('lets the signed-in user update their own name', async () => {
		const response = await signedInAgent
			.put(`/api/v1/users/${userId}`)
			.send({ name: 'Updated Name' });

		expect(response.status).toBe(200);
		expect(userFrom(response).name).toBe('Updated Name');
	});

	test('rejects an update with an invalid body', async () => {
		const response = await signedInAgent
			.put(`/api/v1/users/${userId}`)
			.send({ name: '' });

		expect(response.status).toBe(400);
	});
});
