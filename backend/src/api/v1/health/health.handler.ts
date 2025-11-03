// A small, boring example route, worth reading first if you're new here: router wires the path, handler
// stays thin, service does the real work. No health.service.ts since there's nothing here to reuse.
import type { Request, Response } from 'express';
import { prisma } from '../../../database/prismaClient.ts';

export async function getHealth(_req: Request, res: Response) {
	try {
		// cheapest query that actually proves the db connection and credentials
		// work, not just that postgres is reachable
		await prisma.$queryRaw`SELECT 1`;
		res.status(200).json({ status: 'ok', database: 'ok' });
	} catch (error) {
		console.error('Health check database query failed:', error);
		res.status(503).json({ status: 'error', database: 'unreachable' });
	}
}
