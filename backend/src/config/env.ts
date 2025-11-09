import dotenv from 'dotenv';

// Load relative to this file's own location, not process cwd, so npm scripts behave the same from any folder.
dotenv.config({ path: import.meta.dirname + '/../../.env' });

// Validated first since everything below branches on it.
type NodeEnv = 'development' | 'test' | 'production';

function assertNodeEnv(value: string | undefined): NodeEnv {
	if (value === 'development' || value === 'test' || value === 'production') {
		return value;
	}
	throw new Error(
		`Invalid NODE_ENV '${String(value)}'. Expected 'development', 'test', or 'production'.`,
	);
}

const nodeEnv = assertNodeEnv(process.env.NODE_ENV);

// Number() returns NaN for invalid input instead of throwing, so NaN has
// to be checked explicitly, try/catch would never fire here.
const port = Number(process.env.PORT);
if (Number.isNaN(port)) {
	throw new Error(
		`Invalid PORT '${String(process.env.PORT)}'. Expected a number.`,
	);
}

// Each NODE_ENV talks to its own database, so tests can never touch dev data.
const databaseUrlByEnv: Record<NodeEnv, string | undefined> = {
	development: process.env.DEVELOPMENT_DATABASE_URL,
	test: process.env.TEST_DATABASE_URL,
	production: process.env.PRODUCTION_DATABASE_URL,
};
const databaseUrl = databaseUrlByEnv[nodeEnv];
if (!databaseUrl) {
	throw new Error(
		`Missing database URL for NODE_ENV='${nodeEnv}'. Set ${nodeEnv.toUpperCase()}_DATABASE_URL in .env.`,
	);
}

// Better Auth's own public origin; bare, no path (basePath in auth.ts adds that separately).
let baseUrl: string;
if (nodeEnv === 'production') {
	if (!process.env.PRODUCTION_URL) {
		throw new Error(
			'Missing PRODUCTION_URL (required when NODE_ENV=production).',
		);
	}
	baseUrl = process.env.PRODUCTION_URL;
} else {
	baseUrl = `http://localhost:${String(port)}`;
}

if (!process.env.BETTER_AUTH_SECRET) {
	throw new Error(
		'Missing BETTER_AUTH_SECRET. Generate one with `openssl rand -hex 32`.',
	);
}

// Google sign-in is opt-in: set all three vars to enable it, or leave all blank for email/password only.
const googleClient =
	process.env.GOOGLE_CLIENT_ID &&
	process.env.GOOGLE_CLIENT_SECRET &&
	process.env.GOOGLE_CLIENT_REDIRECT_URI
		? {
				id: process.env.GOOGLE_CLIENT_ID,
				secret: process.env.GOOGLE_CLIENT_SECRET,
				redirectUri: process.env.GOOGLE_CLIENT_REDIRECT_URI,
			}
		: undefined;

// The frontend's own origin, needed to trust its cross-origin sign-up/sign-in
// requests (see trustedOrigins in auth.ts). Blank FRONTEND_URL loads as '', normalized to undefined below.
const rawFrontendUrl = process.env.FRONTEND_URL;
const frontendUrl =
	(rawFrontendUrl === '' ? undefined : rawFrontendUrl) ??
	(nodeEnv === 'production' ? undefined : 'http://localhost:5173');

// Optional, same reasoning as googleClient; forced unset in tests to avoid real email API calls.
const resendApiKey =
	nodeEnv === 'test' ? undefined : process.env.RESEND_API_KEY;

// Same optional/forced-unset-in-tests reasoning; search.handler.ts returns 503 when these are unset.
const youtubeApiKey =
	nodeEnv === 'test' ? undefined : process.env.YOUTUBE_API_KEY;
const anthropicApiKey =
	nodeEnv === 'test' ? undefined : process.env.ANTHROPIC_API_KEY;

const config = {
	port,
	nodeEnv,
	databaseUrl,
	betterAuth: { secret: process.env.BETTER_AUTH_SECRET, url: baseUrl },
	googleClient,
	frontendUrl,
	resendApiKey,
	youtubeApiKey,
	anthropicApiKey,
};

export default config;
