// Meant for Nodejs only

const startTranspile = options => {
	if (!options)
		options = {
			presets: [
				[
					'@babel/preset-env',
					{
						targets: {
							node: 'current',
						},
						useBuiltIns: 'usage',
					},
				],
			],
			plugins: [
				require.resolve('@babel/plugin-proposal-object-rest-spread'),
				require.resolve('@babel/plugin-proposal-class-properties'),
			],
		}

	require('@babel/register')({
		...options,
		babelrc: false,
	})
}

export default startTranspile
