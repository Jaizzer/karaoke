import { defineConfig, devices } from '@playwright/test';

// Runs the golden-path flow against real backend + frontend dev servers, started automatically via webServer.
// Backend runs via dev:e2e, which pins NODE_ENV=test so this suite never touches DEVELOPMENT_DATABASE_URL.
export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5173',
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: [
		{
			command: 'npm run dev:e2e',
			cwd: '../backend',
			port: 3000,
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
		},
		{
			command: 'npm run dev',
			port: 5173,
			reuseExistingServer: !process.env.CI,
			timeout: 30000,
		},
	],
});
