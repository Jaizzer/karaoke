// One shared PrismaClient everywhere data access happens; more than one per process wastes connections.
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/client.ts';
import config from '../config/env.ts';

// Driver adapter pattern: hands Prisma a pg pool directly, letting PrismaClient run serverless without a native binary.
const adapter = new PrismaPg({ connectionString: config.databaseUrl });

export const prisma = new PrismaClient({ adapter });
