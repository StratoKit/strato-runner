module.exports = {
	// jest: https://github.com/facebook/jest/issues/7359
	babelrcRoots: ['packages/*'],
	presets: [
		[
			'@babel/preset-env',
			{
				targets: {
					node: '8.15',
				},
				useBuiltIns: 'usage',
				corejs: 3,
			},
		],
	],
	plugins: [
		'@babel/plugin-proposal-object-rest-spread',
		'@babel/plugin-proposal-class-properties',
		'@babel/plugin-proposal-optional-chaining',
	],
}
