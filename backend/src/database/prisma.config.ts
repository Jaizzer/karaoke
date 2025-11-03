// Read by every prisma CLI command; routing DATABASE_URL through config/env.ts keeps one place deciding per NODE_ENV.
import { defineConfig } from 'prisma/config';
import config from '../config/env.ts';

export default defineConfig({
	schema: 'schema.prisma',
	migrations: {
		path: 'migrations',
	},
	datasource: {
		url: config.databaseUrl,
	},
});
