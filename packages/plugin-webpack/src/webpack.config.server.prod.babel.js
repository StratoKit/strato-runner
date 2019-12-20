import makeBase from './base-config'
import config from '../config'

const cfg = makeBase({
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
	path: config.paths.build.server,
})

cfg.module.rules.forEach(l => delete l.tag)
export default cfg
