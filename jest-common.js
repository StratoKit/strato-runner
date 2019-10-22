module.exports = {
	testEnvironment: 'node',
	testPathIgnorePatterns: ['/node_modules/', '<rootDir>/dist', '_helpers.js'],
	transform: {'\\.jsx?$': ['babel-jest', {rootMode: 'upward'}]},
}
