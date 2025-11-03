import { describe, test, expect } from '@jest/globals';
import request from 'supertest';
import app from '../../../app.ts';

describe('GET /api/v1/health', () => {
	test('reports ok when the database is reachable', async () => {
		const response = await request(app).get('/api/v1/health');
		expect(response.status).toBe(200);
		expect(response.body).toEqual({ status: 'ok', database: 'ok' });
	});
});
