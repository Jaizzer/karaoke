module.exports = {
	extends: ['@commitlint/config-conventional'],
	rules: {
		// This project's actual type vocabulary: "ref" (not "refactor"), and
		// no "perf"/"build"/"ci"/"revert" in practice.
		'type-enum': [
			2,
			'always',
			['feat', 'fix', 'chore', 'ref', 'style', 'test', 'docs'],
		],
		// Subjects are capitalized ("Add x"), the opposite of
		// config-conventional's lower-case default.
		'subject-case': [0],
	},
};
