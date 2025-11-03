// vercelPreviewOriginPattern tests below lock down a real production incident: Vercel preview URLs weren't
// trusted. "Stale unverified account expiry" below is an integration test against the real app/DB.
import { describe, test, expect, afterAll } from '@jest/globals';
import request from 'supertest';
import { randomUUID } from 'node:crypto';
import { vercelPreviewOriginPattern } from './auth.ts';
import app from '../app.ts';
import { prisma } from '../database/prismaClient.ts';

describe('vercelPreviewOriginPattern', () => {
	test('derives a wildcard scoped to the project hostname prefix', () => {
		expect(
			vercelPreviewOriginPattern(
				'https://karaoke-frontend.vercel.app',
			),
		).toBe('https://karaoke-frontend-*.vercel.app');
	});

	test('the pattern brackets the exact preview URL that failed in production', () => {
		const pattern =
			vercelPreviewOriginPattern(
				'https://karaoke-frontend.vercel.app',
			) ?? '';
		const [prefix, suffix] = pattern.split('*');
		const realPreviewUrlFromTheIncident =
			'https://karaoke-frontend-6kkanu9s1-yourorg-projects.vercel.app';

		expect(realPreviewUrlFromTheIncident.startsWith(prefix ?? '')).toBe(
			true,
		);
		expect(realPreviewUrlFromTheIncident.endsWith(suffix ?? '')).toBe(true);
	});

	test('returns undefined for a non-vercel.app URL (e.g. local dev or a custom domain)', () => {
		expect(
			vercelPreviewOriginPattern('http://localhost:5173'),
		).toBeUndefined();
		expect(
			vercelPreviewOriginPattern('https://app.example.com'),
		).toBeUndefined();
	});
});

describe('stale unverified account expiry', () => {
	const password = 'a-reasonably-long-test-password';
	const createdIds: string[] = [];

	afterAll(async () => {
		await prisma.user.deleteMany({ where: { id: { in: createdIds } } });
		await prisma.$disconnect();
	});

	async function backdateCreatedAt(userId: string, msAgo: number) {
		await prisma.user.update({
			where: { id: userId },
			data: { createdAt: new Date(Date.now() - msAgo) },
		});
	}

	test('a stale, never-verified account is replaced by a fresh sign-up with the same email', async () => {
		const email = `stale-${randomUUID()}@example.com`;
		const firstResponse = await request(app)
			.post('/api/v1/authentication/sign-up/email')
			.send({ email, password, name: 'First Claimant' });
		expect(firstResponse.status).toBe(200);
		const firstUserId = (firstResponse.body as { user: { id: string } })
			.user.id;
		createdIds.push(firstUserId);

		// Backdate past the 24h grace period in auth.ts.
		await backdateCreatedAt(firstUserId, 25 * 60 * 60 * 1000);

		const secondResponse = await request(app)
			.post('/api/v1/authentication/sign-up/email')
			.send({ email, password, name: 'Real Owner' });
		expect(secondResponse.status).toBe(200);
		const secondUserId = (secondResponse.body as { user: { id: string } })
			.user.id;
		createdIds.push(secondUserId);

		expect(secondUserId).not.toBe(firstUserId);
		const staleUser = await prisma.user.findUnique({
			where: { id: firstUserId },
		});
		expect(staleUser).toBeNull();

		const realUser = await prisma.user.findUnique({
			where: { id: secondUserId },
		});
		expect(realUser?.name).toBe('Real Owner');
	});

	test('a recent, unverified account is not displaced by a second sign-up attempt', async () => {
		const email = `recent-${randomUUID()}@example.com`;
		const firstResponse = await request(app)
			.post('/api/v1/authentication/sign-up/email')
			.send({ email, password, name: 'First Claimant' });
		expect(firstResponse.status).toBe(200);
		const firstUserId = (firstResponse.body as { user: { id: string } })
			.user.id;
		createdIds.push(firstUserId);

		const secondResponse = await request(app)
			.post('/api/v1/authentication/sign-up/email')
			.send({ email, password, name: 'Impersonator' });
		expect(secondResponse.status).toBe(422);

		const stillThere = await prisma.user.findUnique({
			where: { id: firstUserId },
		});
		expect(stillThere?.name).toBe('First Claimant');
	});

	test('a verified account is never displaced, no matter how old', async () => {
		const email = `verified-${randomUUID()}@example.com`;
		const firstResponse = await request(app)
			.post('/api/v1/authentication/sign-up/email')
			.send({ email, password, name: 'Verified Owner' });
		expect(firstResponse.status).toBe(200);
		const firstUserId = (firstResponse.body as { user: { id: string } })
			.user.id;
		createdIds.push(firstUserId);

		await prisma.user.update({
			where: { id: firstUserId },
			data: { emailVerified: true },
		});
		await backdateCreatedAt(firstUserId, 365 * 24 * 60 * 60 * 1000);

		const secondResponse = await request(app)
			.post('/api/v1/authentication/sign-up/email')
			.send({ email, password, name: 'Impersonator' });
		expect(secondResponse.status).toBe(422);

		const stillThere = await prisma.user.findUnique({
			where: { id: firstUserId },
		});
		expect(stillThere?.emailVerified).toBe(true);
	});
});
