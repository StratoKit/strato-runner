import webpack from 'webpack'
import makeBase from './base-config'

const cfg = makeBase({
	devtool: 'cheap-module-source-map',
	hot: true,
	reactHot: true,
	entry: {
		app: ['stratokit/webpack/polyfills', 'stratokit/client'],
	},
	path: `${config.paths.build.client}-dev`,
})

cfg.plugins = [...cfg.plugins, new webpack.NamedModulesPlugin()]

cfg.module.rules.forEach(l => delete l.tag)
export default cfg
