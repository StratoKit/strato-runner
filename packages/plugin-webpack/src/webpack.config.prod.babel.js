import webpack from 'webpack'
import config from '../config'
import makeBase from './base-config'

const {paths} = config
const esmodules = !!process.env.ESMODULES
const minify = !!process.env.MINIFY

const cfg = makeBase({
	isProd: true,
	devtool: 'nosources-source-map',
	entry: {
		app: ['stratokit/webpack/polyfills', 'stratokit/client'],
	},
	path: `${paths.build.client}${esmodules ? '-esmodules' : ''}`,
	esmodules,
	minify,
})

cfg.plugins = [
	...cfg.plugins,
	new webpack.optimize.AggressiveMergingPlugin(),
	new webpack.optimize.MinChunkSizePlugin({minChunkSize: 15000}),
]

cfg.module.rules.forEach(l => delete l.tag)
export default cfg
