# Karaoke

A QR-code karaoke queue: a host runs a room on a screen wired to the sound
system, guests scan a code to join from their phones, search for a song by
title/artist/lyric (typos and all — an LLM resolves the fuzzy search into an
actual YouTube video), and queue it up. The host's screen plays the queue
back-to-back. Hosts have full control over their room; guests can only
remove songs they personally added.

> **Status**: the room/queue/search domain hasn't been built yet — what's
> here so far is the auth + tooling scaffold (sign-up/sign-in, CI/CD,
> testing setup) everything else gets built on top of.

## Architecture

`backend/` is an Express "monolith" — a single deployable service that owns
authentication and all API routes, rather than being split into
microservices. `frontend/` is a separate React SPA that talks to it over
HTTP (cross-origin in dev: 5173 → 3000). Each is its own independent npm
project (own `package.json`, own `node_modules`); the root `package.json`
only holds repo-wide git tooling.

```
karaoke/
├── .github/workflows/   # CI (test on every push/PR) and CD (deploy on push to main)
├── .husky/               # pre-commit: runs each changed service's tests + lint-staged
│                          # commit-msg: enforces feat:/fix:/chore:/etc. commit messages
├── .vscode/tasks.json    # auto-starts both dev servers on folder open
├── backend/               # Express + TypeScript + Prisma + PostgreSQL
└── frontend/              # React + Vite + Tailwind SPA
```

## Backend stack

- **Express 5** — HTTP layer. Routes live in `src/api/v1/<domain>/`, each
  split into `*.route.ts` (path → handler wiring), `*.handler.ts` (request/
  response, thin), and `*.service.ts` (the actual logic, reusable outside
  HTTP). `src/api/v1/health/` is the smallest complete example of that
  shape; `src/api/v1/users/` is the next smallest, and the pattern to copy
  for each new domain (rooms, queue, search, ...).
- **Prisma + PostgreSQL** — `src/database/schema.prisma` defines the
  tables; `src/database/prismaClient.ts` exports the one shared client every
  service imports. Only `User`/`Session`/`Account`/`Verification` exist so
  far — the exact shape Better Auth's Prisma adapter expects.
- **Better Auth** — the entire authentication system (sign-up, sign-in,
  sign-out, sessions, email verification, optional Google OAuth), used for
  **hosts** (they need a persistent account to own rooms). Guests joining a
  room do not get a Better Auth account — they get a lightweight,
  room-scoped identity instead (not built yet). Mounted at
  `/api/v1/authentication/*` in `src/app.ts`; configured in
  `src/lib/auth.ts`. `src/middleware/authorization.ts` is the `requireAuth`
  guard that host-only routes use to read the current session.
- **TypeScript**, strict mode, native ESM.
- **Jest + Supertest** — integration tests that run real HTTP requests
  through the real app against a real (test) database. See
  `src/api/v1/users/users.handler.test.ts`.
- **Vercel** — deployment target; `backend/vercel.json` wraps the compiled
  `dist/server.js` as a single serverless function.

## Frontend stack

- **React + Vite + TypeScript** — `src/App.tsx` is the entry component
  (auth gate + router); `src/features/auth/AuthPanel.tsx` is the reference
  implementation of the sign-up/in flow; `src/pages/HomePage.tsx` is the
  reference implementation of calling a protected route.
- **Tailwind CSS** via `@tailwindcss/vite` — see `src/index.css` for the
  design tokens. Guest-facing pages (join/search/queue) should stay
  mobile-first — that's the device 100% of guests will use them from. The
  host's "now playing" screen is the one page allowed to target a
  TV/tablet/laptop layout instead.
- **`better-auth/react`** (`src/lib/authClient.ts`) — same session cookie as
  the backend, typed methods, and a `useSession()` hook.
- **`src/lib/api.ts`** — a small fetch wrapper for the backend's non-auth
  routes.
- **Vitest + Testing Library** — `src/App.test.tsx` is a smoke test with
  `fetch` stubbed.

Both use the same tooling pattern: **ESLint (typescript-eslint) + Prettier +
lint-staged + Husky**, enforced automatically before every commit; commit
*messages* are checked separately by commitlint (`commitlint.config.js`),
enforcing `type: Capitalized subject` (`feat`/`fix`/`chore`/`ref`/`style`/
`test`/`docs`) with no body — see the existing commit history for examples.

## Setup

Requires Node 24.x and a local PostgreSQL server.

```sh
# from the repo root — installs Husky + lint-staged + commitlint
npm install

# --- backend ---
cd backend
npm install
cp .env.example .env        # then fill in BETTER_AUTH_SECRET (openssl rand -hex 32)
                             # and the two database URLs (see below)

createdb karaoke_development
createdb karaoke_test
npm run db:migrate          # applies src/database/migrations/ to the dev database
NODE_ENV=test npx prisma migrate deploy --config=./src/database/prisma.config.ts # same, for the test database

npm run dev                 # http://localhost:3000
npm test

# --- frontend (separate terminal) ---
cd frontend
npm install
npm run dev                 # http://localhost:5173
npm test
```

Google OAuth is optional — leave `GOOGLE_CLIENT_ID`/`_SECRET`/`_REDIRECT_URI`
blank in backend's `.env` to run with email/password auth only.

Real email delivery (verification links, password-reset links) is also
optional — leave `RESEND_API_KEY` blank to have those just log to the
console instead, which is enough to exercise the flows locally.

The frontend's dev port is pinned to 5173 (`frontend/vite.config.ts`,
`strictPort: true`) because the backend's `trustedOrigins` needs to know
that exact origin in advance to trust its cross-origin requests.

## API routes

| Method | Path                                          | Auth required | Notes                                    |
| ------ | ---------------------------------------------- | -------------- | ----------------------------------------- |
| GET    | `/api/v1/health`                               | No             | Checks the DB is reachable                |
| POST   | `/api/v1/authentication/sign-up/email`         | No             | Better Auth — creates a host + session    |
| POST   | `/api/v1/authentication/sign-in/email`         | No             | Better Auth                               |
| POST   | `/api/v1/authentication/sign-out`              | Yes            | Better Auth                               |
| GET    | `/api/v1/authentication/get-session`           | Yes            | Better Auth — returns the current session |
| GET    | `/api/v1/authentication/sign-in/social/google` | No             | Only if Google OAuth is configured        |
| GET    | `/api/v1/users/:id`                            | Yes, own id    | Returns the caller's own profile          |
| PUT    | `/api/v1/users/:id`                            | Yes, own id    | Updates the caller's own `name`           |

Rooms, guest join, queue, and search routes will be added as that domain is
built.

## Deploying

`.github/workflows/cd.yml` deploys whichever of `backend/`/`frontend/`
changed to Vercel on every push to `main` (backend also gets its pending
Prisma migrations applied first). Production database is
[Neon](https://neon.tech). One-time setup before it'll work:

1. `cd backend && npx vercel link`, and separately `cd frontend && npx
   vercel link` — connects each folder to its own Vercel project. Then copy
   the `orgId`/`projectId` each writes to `.vercel/project.json` into the
   matching job's `VERCEL_ORG_ID`/`VERCEL_PROJECT_ID` in
   `.github/workflows/cd.yml` (see that file's header comment for why this
   is pinned explicitly rather than left to auto-detection).
2. Add repo secrets (Settings → Secrets and variables → Actions):
   `VERCEL_TOKEN`, `PRODUCTION_DATABASE_URL` (Neon connection string),
   `PRODUCTION_URL`, `FRONTEND_URL`, `BETTER_AUTH_SECRET`.
3. Update `frontend/vercel.json`'s rewrite destination from the
   `karaoke-backend.vercel.app` placeholder to the backend's real Vercel
   URL.

## Notes for anyone studying this codebase

Every non-obvious decision has a comment at the point it's made.

- **Backend**: start at `src/app.ts` (the request pipeline), then
  `src/config/env.ts` (what configuration the app needs and why), then
  `src/lib/auth.ts` (how auth is wired).
- **Frontend**: start at `src/App.tsx`, then
  `src/features/auth/AuthPanel.tsx` and `src/pages/HomePage.tsx`.
