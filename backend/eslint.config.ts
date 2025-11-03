// @ts-check
import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettierConfig from 'eslint-config-prettier';

export default defineConfig(
	// Compiled/generated output (dist/, Prisma's client) isn't source we wrote and shouldn't be linted as TS.
	{ ignores: ['dist/**', 'src/database/generated/**'] },
	{
		files: ['src/**/*.ts'],
		extends: [
			js.configs.recommended,
			// Type-checked rulesets catch bugs plain linting can't (floating promises, unsafe any), worth the extra cost.
			tseslint.configs.strictTypeChecked,
			tseslint.configs.stylisticTypeChecked,
		],
		languageOptions: {
			globals: {
				...globals.node,
			},
			parserOptions: {
				// Lets typescript-eslint find the right tsconfig for each
				// file automatically instead of hand-listing `project`.
				projectService: true,
			},
		},
		rules: {
			// Without this, `` `port ${someNumber}` `` is flagged as unsafe
			// even though numbers stringify perfectly safely.
			'@typescript-eslint/restrict-template-expressions': [
				'error',
				{ allowNumber: true },
			],
		},
	},
	// Must come last: turns off any ESLint stylistic rule that would fight
	// with Prettier's formatting decisions.
	prettierConfig,
);
