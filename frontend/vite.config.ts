import { defineConfig } from 'vite';
import { configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
	plugins: [react(), tailwindcss()],
	server: {
		// Pinned, not left to Vite's port-hunting, since the backend's trustedOrigins must know this exact origin.
		port: 5173,
		// If 5173 is taken, Vite would silently move ports and break sign-in with a confusing CORS error.
		strictPort: true,
		// Forwards /api/* to the real backend in dev, so the browser only ever talks to this dev server's
		// own origin, the same same-origin approach vercel.json's rewrites use in production (see authClient.ts).
		proxy: {
			'/api': {
				target: 'http://localhost:3000',
				changeOrigin: true,
			},
		},
	},
	test: {
		globals: true,
		environment: 'jsdom',
		setupFiles: './vitest.setup.ts',
		// e2e/ is Playwright's directory (npm run test:e2e), not Vitest's; its specs use fixtures Vitest can't run.
		exclude: [...configDefaults.exclude, 'e2e/**'],
	},
});
