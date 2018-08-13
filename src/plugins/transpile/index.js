import PropTypes from 'prop-types'

export default {
	config: {
		stratokit: {
			transpilePlugins: true,
			babelOptions: {
				$def: [
					'Options passed to Babel for plugin transpilation',
					PropTypes.object.isRequired,
					{
						presets: [['env', {targets: {node: 'current'}}]],
						plugins: ['transform-object-rest-spread'],
					},
				],
			},
		},
	},
}
