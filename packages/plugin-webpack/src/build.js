import {load} from '@stratokit/launcher'
import '.'

const run = async () => {
	const sk=await load('webpack',{webpack:})
	const {webpack} = sk.plugins
	const cfg = webpack.makeWPConfig({target:'node',
	devtool: 'source-map',
	isServer: true,
	prerender: true,
	isProd: true,
	minify: process.env.MINIFY,
	entry: {
		server: [
			'source-map-support/register',
			'stratokit/webpack/polyfills',
			config.stratokit.server.entry,
		],
		doImport: [
			'source-map-support/register',
			'stratokit/webpack/polyfills',
			'app/_server/database/fm-migrate/doImport',
		],
	},
	path: sk.config.paths.build.server,
 })
	console.log(process.argv[2])
	await webpack.
}
