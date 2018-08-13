export default {
	paths: {
		$def: [
			'Filesystem paths relevant to the app',
			PropTypes.object.isRequired,
			{
				root: {$path: '.'},
				app: {$path: './src'},
				nodeModules: {$path: './node_modules'},
			},
		],
	},
	stratokit: {
		$def: [
			'StratoKit configuration',
			PropTypes.object.isRequired,
			{
				configOps: {$def: ['$op functions', PropTypes.object]},
			},
		],
	},
}
