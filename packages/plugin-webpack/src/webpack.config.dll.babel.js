import webpack from 'webpack'
import path from 'path'
import config from '../config'
import makeBase from './base-config'

const {
	paths,
	stratokit: {
		webpack: {dlls},
	},
} = config

// Build JSON with:
// "EOA" is so we can use trailing comma in json
const baseDlls = require(path.join(
	paths.root,
	'config',
	'client-dev.dlls.json'
)).filter(l => l !== 'EOA')
// Extra dlls from config, e.g. extra assets or so
const allDlls = dlls && dlls.length ? baseDlls.concat(dlls) : baseDlls

if (allDlls.some(l => l.includes('webpack-hot'))) {
	throw new Error(
		'webpack-hot-* cannot be in the dlls, it will break hot loading'
	)
}

// This needs to be the exact same config as dev
const cfg = makeBase({
	devtool: 'cheap-module-source-map',
	isDll: true,
	hot: true,
	reactHot: true,
	entry: {
		dlls: allDlls,
	},
	path: paths.build.dll,
})

cfg.plugins = [
	...cfg.plugins,
	new webpack.DllPlugin({
		name: '[name]',
		path: path.resolve(paths.build.dll, '_[name].json'),
	}),
]

cfg.module.rules.forEach(l => delete l.tag)
export default cfg
