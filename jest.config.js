module.exports = {
	testEnvironment: 'node',
	testPathIgnorePatterns: [
		// Don't check packages, we do those via projects
		'<rootDir>/packages/.*',
		'/node_modules/',
		'_helpers.js',
	],
	projects: ['<rootDir>', '<rootDir>/packages/*'],
	transform: {'\\.jsx?$': ['babel-jest', {rootMode: 'upward'}]},
}
