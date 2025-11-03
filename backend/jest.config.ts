import type { Config } from 'jest';
import { createDefaultEsmPreset } from 'ts-jest';

// ts-jest's ESM preset makes import/export work in Jest, hence --experimental-vm-modules in package.json.
const presetConfig = createDefaultEsmPreset({});

export default {
	...presetConfig,
	testEnvironment: 'node',
	testMatch: [
		'**/tests/**/*.test.ts',
		'**/__tests__/**/*.test.ts',
		'**/?(*.)+(spec|test).ts',
	],
	// Source files import each other as ./foo.js at the type level; maps those back to the .ts source for ts-jest.
	moduleNameMapper: {
		'^(\\.{1,2}/.*)\\.js$': '$1',
	},
	setupFiles: ['dotenv/config'],
	testTimeout: 30000,
} satisfies Config;
