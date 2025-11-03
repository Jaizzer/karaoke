import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';
import { defineConfig, globalIgnores } from 'eslint/config';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig([
	globalIgnores(['dist']),
	{
		files: ['**/*.{ts,tsx}'],
		extends: [
			js.configs.recommended,
			tseslint.configs.recommended,
			// eslint-plugin-react-hooks ships two shapes of this config:
			// `configs['recommended-latest']` (legacy eslintrc-style, `plugins`
			// as a string array) and `configs.flat['recommended-latest']` (flat
			// config, `plugins` as an object) — this project uses flat config,
			// so it has to be the latter or ESLint refuses to load it.
			reactHooks.configs.flat['recommended-latest'],
			// Flags anything that would break Vite's Fast Refresh (e.g. a file
			// exporting both a component and a non-component value) — only
			// matters for dev-server ergonomics, never a runtime bug.
			reactRefresh.configs.vite,
		],
		languageOptions: {
			ecmaVersion: 2020,
			globals: globals.browser,
		},
	},
	// Must come last: turns off any ESLint stylistic rule that would fight
	// with Prettier's formatting decisions.
	prettierConfig,
]);
