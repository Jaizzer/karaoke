// Better Auth is the app's entire auth system (sign-up/in/out, sessions,
// email, optional Google OAuth), replacing an earlier hand-rolled JWT setup.
import { betterAuth } from 'better-auth/minimal';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { createAuthMiddleware } from 'better-auth/api';
import { prisma } from '../database/prismaClient.ts';
import config from '../config/env.ts';
import { sendAuthEmail } from './mailer.ts';

// How long an unverified account reserves its email before it's abandoned (see hooks.before below).
const UNVERIFIED_ACCOUNT_GRACE_PERIOD_MS = 24 * 60 * 60 * 1000;

// Trusts a wildcard scoped to FRONTEND_URL's own hostname prefix, since every
// Vercel preview deploy gets its own *.vercel.app origin. No-op outside vercel.app.
export function vercelPreviewOriginPattern(
	frontendUrl: string,
): string | undefined {
	const url = new URL(frontendUrl);
	if (!url.hostname.endsWith('.vercel.app')) {
		return undefined;
	}
	const projectSlug = url.hostname.slice(0, -'.vercel.app'.length);
	return `${url.protocol}//${projectSlug}-*.vercel.app`;
}

const trustedOrigins = config.frontendUrl
	? [
			config.frontendUrl,
			vercelPreviewOriginPattern(config.frontendUrl),
		].filter((origin) => origin !== undefined)
	: [];

export const auth = betterAuth({
	// Every Better Auth endpoint lives under this path; must match the mount in src/app.ts.
	basePath: '/api/v1/authentication',
	baseURL: config.betterAuth.url,
	secret: config.betterAuth.secret,

	// Checked independently of app.ts's cors() middleware; both must allow the frontend's origin.
	trustedOrigins,

	// Production frontend/backend are different *.vercel.app sites, so the
	// session cookie needs SameSite=None+Secure there; dev keeps the default Lax.
	advanced:
		config.nodeEnv === 'production'
			? { defaultCookieAttributes: { sameSite: 'none', secure: true } }
			: undefined,

	database: prismaAdapter(prisma, {
		provider: 'postgresql',
	}),

	// Deletes a stale, never-verified account before /sign-up/email runs, so a
	// real signup doesn't bounce off USER_ALREADY_EXISTS.
	hooks: {
		before: createAuthMiddleware(async (ctx) => {
			if (ctx.path !== '/sign-up/email') {
				return;
			}
			const email = (ctx.body as { email?: unknown } | undefined)?.email;
			if (typeof email !== 'string') {
				return;
			}
			await prisma.user.deleteMany({
				where: {
					email: email.toLowerCase(),
					emailVerified: false,
					createdAt: {
						lt: new Date(
							Date.now() - UNVERIFIED_ACCOUNT_GRACE_PERIOD_MS,
						),
					},
				},
			});
		}),
	},

	emailAndPassword: {
		enabled: true,
		// This is what actually enables forgot-password; otherwise the endpoint returns RESET_PASSWORD_DISABLED.
		sendResetPassword: async ({ user, url }) => {
			await sendAuthEmail(
				user.email,
				'Reset your password',
				`<p>Click the link below to reset your password:</p><p><a href="${url}">${url}</a></p><p>This link expires in 1 hour.</p>`,
			);
		},
	},

	emailVerification: {
		sendVerificationEmail: async ({ user, url }) => {
			await sendAuthEmail(
				user.email,
				'Verify your email',
				`<p>Click the link below to verify your email address:</p><p><a href="${url}">${url}</a></p>`,
			);
		},
		sendOnSignUp: true,
		autoSignInAfterVerification: true,
		expiresIn: 3600, // 1 hour
	},

	// Only registers Google when all three credentials are set, so a fresh clone works with email/password alone.
	socialProviders: config.googleClient
		? {
				google: {
					clientId: config.googleClient.id,
					clientSecret: config.googleClient.secret,
					redirectURI: config.googleClient.redirectUri,
				},
			}
		: undefined,
});
