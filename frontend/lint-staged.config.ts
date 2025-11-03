export default {
	'*.{js,jsx,ts,tsx}': ['eslint', 'prettier --check'],
	'*.{json,yml,yaml,md}': ['prettier --check'],
	// tsconfig already sets noEmit: true, so plain tsc -b here only typechecks, same command the build script uses.
	'*.{ts,tsx}': [() => 'tsc -b'],
};
