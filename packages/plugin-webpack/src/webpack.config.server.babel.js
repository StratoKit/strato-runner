import webpack from 'webpack'
import StartServerPlugin from 'start-server-webpack-plugin'
import makeBase from './base-config'
import config from '../config'

const {paths} = config

const cfg = makeBase({
	devtool: 'cheap-module-eval-source-map',
	hot: true,
	target: 'node',
	prerender: true,
	entry: {
		server: ['stratokit/webpack/polyfills', config.stratokit.server.entry],
	},
	path: `${paths.build.server}-dev`,
})

cfg.plugins = [
	...cfg.plugins,
	// // Can't make sourcemaps work with node and eval
	// new webpack.SourceMapDevToolPlugin({
	// 	test: /\.(js|jsx|css)($|\?)/i,
	// 	module: true, // required for nodejs source mapping
	// 	columns: false,
	// }),
	// new webpack.optimize.AggressiveSplittingPlugin(),
	new webpack.NamedModulesPlugin(),
	new StartServerPlugin({
		name: 'server.js',
		entryName: 'server',
		nodeArgs: process.env.DEBUG_SERVER ? ['--inspect'] : undefined,
	}),
]

cfg.module.rules.forEach(l => delete l.tag)
export default cfg
