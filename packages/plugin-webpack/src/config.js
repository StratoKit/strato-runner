let lodashAliases
try {
	// See https://github.com/lodash/lodash-webpack-plugin/issues/101
	const lodash = require(require.resolve('lodash', {
		paths: [process.cwd()],
	}))

	lodashAliases = {
		// Optimize lodash-es, everybody should use lodash
		'lodash-es': 'lodash',
		'lodash-es/isEqualWith': 'lodash/isEqualWith',
		'lodash-es/isObject': 'lodash/isObject',
		'lodash-es/mapValues': 'lodash/mapValues',
		'lodash-es/merge': 'lodash/merge',
		'lodash-es/noop': 'lodash/noop',
		'lodash-es/toPath': 'lodash/toPath',
	}
	for (const key of Object.keys(lodash)) {
		if (typeof lodash[key] === 'function')
			lodashAliases[`lodash.${lodash.toLower(key)}`] = `lodash/${key}`
	}
} catch (error) {
	if (error.code !== 'MODULE_NOT_FOUND') throw error
}

const config = {
	paths: {
		stratokit: c => `${c.paths.root}/lib`,
		app: c => `${c.paths.root}/src`,
		plugins: c => `${c.paths.root}/plugins`,
		build: {
			root: c => `${c.paths.root}/build`,
			cache: c => `${c.paths.build.root}/cache`,
			client: c => `${c.paths.build.root}/client`,
			server: c => `${c.paths.build.root}/server`,
		},
		nodeModules: c => `${c.paths.root}/node_modules`,
	},

	webpack: {
		target: 'node', // or 'browser'
		publicPath: '/_',

		alias: {
			app: c => c.paths.app,
			...lodashAliases,
		},
		use: {
			urlLoader: 1000,
			css: {
				enabled: true,
				extract: true,
				sass: true,
				modules: true,
				autoprefixer: true,
			},
			svgo: {
				enabled: true,
			},
		},

		extensions: {
			json: ['json'],
			raw: ['txt'],
			assets: [
				'png',
				'jpg',
				'jpeg',
				'gif',
				'ttf',
				'otf',
				'eot',
				'woff',
				'woff2',
				'mp3',
				'wav',
				'svg',
				'pdf',
			],
			css: ['css', 'scss', 'sass'],
			svg: ['svg'],
			sass: ['scss', 'sass'],
			js: ['js', 'jsx'],
		},

		// any globals etc
		defines: {
			__TARGET__: c => c.webpack.target,
			__IN_WEBPACK__: true,
			__CONFIG__: {
				name: c => c.appName,
				version: c => c.version,
				// languages: c=>c.i18n.languages,
				// sections: c=>c.i18n.sections,
				// roles: c=>c.users.roles,
				// googleClientId: c=>c.users.googleClientId,
				// fbPixelId: c=>c.trackers.fbPixelId,
				// gaId: c=>c.trackers.gaId,
				// gtmId: c=>c.trackers.gtmId,
				// gAdwordsId: c=>c.trackers.gAdwordsId,
				// hjId: c=>c.trackers.hjId,
				// mcId: c=>c.trackers.mcId,
				// mapKey: c=>c.mapKey,
				// prefix: c=>c.stratokit.server.prefix,
				// graphqlPath: c=>c.graphql.path,
			},
		},
		// add any modules that break when transpiling
		dontTranspileModules: ['mapbox-gl'],
	},
}

export default config
