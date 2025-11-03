// Runs against staged files only (Husky's pre-commit hook), so a commit never gets far with lint/format/type errors.
export default {
	'*.{js,jsx,ts,tsx}': ['eslint', 'prettier --check'],
	'*.{json,yml,yaml,md}': ['prettier --check'],
	// No space in "ts,tsx": `'*.{ts, tsx}'` (with a space) is a glob that
	// never matches anything, which silently skipped this typecheck before.
	'*.{ts,tsx}': [() => 'tsc --noEmit'],
};
