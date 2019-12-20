/* eslint-disable complexity, no-console */
import webpack from 'webpack'
import path from 'path'
import fs from 'fs'
import nodeExternals from 'webpack-node-externals'
import StatsPlugin from 'stats-webpack-plugin'
import AssetsPlugin from 'assets-webpack-plugin'
import MiniCssExtractPlugin from 'mini-css-extract-plugin'
import TerserPlugin from 'terser-webpack-plugin'
import CleanupPlugin from 'webpack-cleanup-plugin'
import HashOutput from 'webpack-plugin-hash-output'

const hasExt = exts => f => {
	const ext = f.slice(f.lastIndexOf('.') + 1).toLowerCase()
	return exts.includes(ext)
}

const applyPathsToLoader = paths => loader => {
	const l = {...loader}
	// TODO arrays and exclude
	if (l.includeDir) {
		l.include = paths[l.includeDir]
		delete l.includeDir
	}
	return l
}
const makeBaseWebpackConfig = (
	config,
	{
		path: destPath,
		target,
		isProd,
		isDll,
		entry,
		devtool,
		prerender,
		babel = {},
		minify,
		hot,
		reactHot,
		esmodules,
	}
) => {
	const {
		paths,
		stratokit: {
			server: {prefix},
			webpack: {
				alias: origAlias,
				use,
				extensions,
				defines: origDefines,
				loaders: extraLoaders,
				dontTranspileModules,
			},
		},
	} = config
	if (!target) target = config.webpack.target
	const isServer = target === 'node'
	const isClient = target === 'browser'
	const publicPath = isServer
		? path.relative(paths.root, destPath)
		: `${prefix}${config.webpack.publicPath}`
	const useDlls = isClient && !isProd && !isDll && config.webpack.useDlls
	const dllPath = useDlls && path.resolve(paths.build.dll, '_dlls.json')
	const extractText = use.css.enabled && use.css.extract && !isServer
	console.error(
		`>>> Webpack: PID ${process.pid}, ${JSON.stringify({
			path: destPath,
			isServer,
			isProd,
			minify,
			hot,
			reactHot,
			isDll,
			useDlls,
			extractText,
			prerender,
			entry: Object.keys(entry),
		})}`
	)
	if (useDlls) {
		try {
			const stats = fs.statSync(dllPath)
			const t = new Date(stats.mtime)
			console.error(
				`>>> Using dlls built at ${t}, use the build:dll task to rebuild`
			)
		} catch (err) {
			throw new Error(
				'You are using dlls for the dev build. Run the build:dll task first.'
			)
		}
	}
	// TODO replace this with proper interpolation, see confippet
	const alias = {...origAlias}
	for (const a of Object.keys(alias)) {
		const k = alias[a]
		const p = paths[k] || k
		if (p) {
			alias[a] = p
		}
	}
	if (reactHot) {
		alias['react-dom'] = '@hot-loader/react-dom'
	}

	// Remember, loaders apply from the last to the first, on every match
	const loaders = [
		{
			tag: 'raw',
			test: hasExt(extensions.raw),
			loader: 'raw-loader',
		},
		{
			tag: 'assets',
			test: hasExt(extensions.assets),
			exclude: /\.icon\.svg$/,
			loaders: [
				{
					loader: use.urlLoader ? 'url-loader' : 'file-loader',
					options: {
						limit: use.urlLoader ? use.urlLoader : undefined,
						// NOTE: We force the url location to be the one the browser sees,
						// even on the server. We don't expect having to actually read
						// the files on the server.
						// Furthermore, we rely on the path hashes to be the same
						// in client and server build (they are)
						publicPath: `${prefix}${config.stratokit.webpack.publicPath}/`,
						// Don't actually emit files in server build
						// they are named by md5 hash so will be the same in both builds
						emitFile: !isServer,
					},
				},
			],
		},
		{
			tag: 'babel',
			test: hasExt(extensions.js),
			loaders: [
				{
					loader: 'babel-loader',
					query: {
						cacheDirectory: path.join(
							paths.build.cache,
							`babel-${isServer}${isProd}${babel.hot}`
						),
						babelrc: false,
						presets: [
							// Need to specify like this or webpack eats the path when running inside server
							[
								path.join(paths.stratokit, 'webpack', 'babel-config'),
								{
									...babel,
									reactHot,
									noModules: true,
									inWebpack: true,
									esmodules,
									isBrowser: isClient,
								},
							],
						],
					},
				},
			].filter(Boolean),
			// Only whitelist paths that should be transpiled
			// In prod non-esmodules, transpile everything; safest + works for IE
			include:
				isProd && !esmodules
					? paths.root
					: [paths.app, paths.stratokit, paths.plugins],
			exclude:
				isProd && dontTranspileModules?.length
					? dontTranspileModules.map(
							// This matches modules under our own node_modules path
							// The .* is to allow hierarchical npm trees (pnpm)
							m => new RegExp(`${paths.nodeModules}.*/${m}`)
					  )
					: undefined,
		},
		{
			tag: 'sprite',
			include: /\.icon\.svg$/,
			loader: `${paths.plugins}/icons/icon-loader`,
		},
		...extraLoaders.map(x => applyPathsToLoader(paths)(x)),
	].filter(Boolean)

	if (use.css.enabled) {
		const {modules, sass} = use.css
		const getLoaders = modules =>
			[
				// inject as stylesheet in page
				!isServer && 'style-loader',
				// convert to js, modular classnames etc
				{
					loader: 'css-loader',
					query: {
						exportOnlyLocals: isServer,
						modules: modules || undefined,
						importLoaders: 1,
						localIdentName: '[name]_[local]_[hash:base64:5]',
					},
				},
				// minimize etc
				{loader: 'postcss-loader'},
			].filter(Boolean)

		loaders.push({
			tag: 'css',
			test: hasExt(extensions.css),
			loaders: getLoaders(false),
			exclude: modules ? [paths.app, paths.stratokit] : undefined,
		})
		if (modules) {
			const cssLoaders = getLoaders(true)
			loaders.push({
				tag: 'css-modules',
				test: hasExt(extensions.css),
				loaders: cssLoaders,
				include: [paths.app, paths.stratokit],
			})
		}
		if (sass) {
			loaders.push({
				tag: 'sass',
				test: hasExt(extensions.sass),
				loader: 'sass-loader',
			})
		}
	}

	// optimize svg images
	if (use.svgo.enabled) {
		loaders.push({
			tag: 'svgo',
			test: hasExt(extensions.svg),
			loaders: [
				{
					loader: 'svgo-loader',
					options: {plugins: [{removeViewBox: false}]},
				},
			],
		})
	}
	// Canonicalize on .loaders for post-processing
	for (const l of loaders) {
		// Make loaders, include and exclude always arrays for easy patching
		if (l.loader) {
			l.loaders = l.loader.split('!').map(ldr => {
				let loader = ldr
				let query
				const q = ldr.indexOf('?')
				if (q >= 0) {
					loader = ldr.slice(0, q)
					query = ldr.slice(q + 1)
				}
				return {loader, query}
			})
			delete l.loader
		}
		if (l.exclude) {
			if (!Array.isArray(l.exclude)) {
				l.exclude = [l.exclude]
			}
		} else {
			l.exclude = []
		}
		if (l.include) {
			if (!Array.isArray(l.include)) {
				l.include = [l.include]
			}
			// revisit this with later webpack
			// } else {
			// 	l.include = []
		}
	}

	if (extractText) {
		for (const l of loaders) {
			if (
				l.loaders &&
				(l.loaders[0] === 'style-loader' ||
					l.loaders[0].loader === 'style-loader')
			) {
				l.loaders[0] = MiniCssExtractPlugin.loader
			}
		}
	}

	// Update .eslintrc when you make changes here
	const defines = {
		'process.env.NODE_ENV': isProd ? 'production' : 'development',
		...origDefines,
		__CLIENT__: Boolean(isClient || isDll),
		__PRODUCTION__: Boolean(isProd),
		__SSR__: Boolean(prerender),
	}
	if (isServer) delete defines['process.env.NODE_ENV']
	for (const [key, value] of Object.entries(defines)) {
		if (typeof value === 'object') {
			// __CONFIG__.foo should just get the foo part, not the whole __CONFIG__
			for (const [subkey, subvalue] of Object.entries(value)) {
				defines[`${key}.${subkey}`] = JSON.stringify(subvalue)
			}
		}
		defines[key] = JSON.stringify(value)
	}
	// For least surprise, all defines should also be for `global`
	// this also makes it easy to use these defines in non-webpack
	for (const [key, value] of Object.entries(defines)) {
		if (!key.startsWith('global.') && !defines[`global.${key}`])
			defines[`global.${key}`] = value
	}
	const cfg = {
		mode: isProd ? 'production' : 'development',
		context: paths.root,
		devtool,
		entry,
		output: {
			filename: isProd ? '[chunkhash].js' : '[name]_[hash].js',
			path: destPath,
			library: isDll ? '[name]' : undefined,
			publicPath: `${publicPath}/`.replace(/\/+/g, '/'),
		},
		resolve: {
			// Keep this up-to-date with webpack's order, we only want to add .jsx
			extensions: ['.wasm', '.mjs', '.js', '.jsx', '.json'],
			alias,
		},
		module: {
			rules: loaders,
		},
		optimization: {
			noEmitOnErrors: true,
			splitChunks: {
				chunks: isProd && isClient ? 'all' : undefined,
				cacheGroups: {vendors: false},
			},
			minimize: !!minify,
			minimizer: minify
				? [
						new TerserPlugin({
							sourceMap: Boolean(devtool) && devtool !== 'eval',
							extractComments: 'some',
							terserOptions: {
								output: {
									safari10: true,
									semicolons: false,
								},
							},
						}),
				  ]
				: undefined,
		},
		plugins: [
			// Rename files with their content hash. Keep first
			isProd &&
				new HashOutput({
					validateOutput: true,
					validateOutputRegex: /^[^_].*\.js$/,
				}),

			hot && new webpack.HotModuleReplacementPlugin(),

			// Hardcode given defines
			new webpack.DefinePlugin(defines),

			// Pass options to all loaders
			new webpack.LoaderOptionsPlugin({
				// https://webpack.js.org/guides/migrating/#uglifyjsplugin-minimize-loaders
				minimize: Boolean(minify),
			}),

			// Create styles.css
			extractText &&
				new MiniCssExtractPlugin({
					filename: isProd ? 'style-[hash].css' : 'style.css',
				}),

			// new HardSourceWebpackPlugin({
			// 	// Either an absolute path or relative to output.path.
			// 	cacheDirectory: `${paths.build.cache}/[confighash]`,
			// 	// Either an absolute path or relative to output.path. Sets webpack's
			// 	// recordsPath if not already set.
			// 	recordsPath: `${paths.build.cache}/[confighash]/records.json`,
			// 	// Optional field. Either a string value or function that returns a
			// 	// string value.
			// 	configHash: webpackConfig => {
			// 		// Build a string value used by HardSource to determine which cache to
			// 		// use if [confighash] is in cacheDirectory or if the cache should be
			// 		// replaced if [confighash] does not appear in cacheDirectory.
			// 		return hash(process.env.NODE_ENV + JSON.stringify(webpackConfig.entry))
			// 	},
			// 	// Optional field. This field determines when to throw away the whole
			// 	// cache if for example npm modules were updated.
			// 	environmentPaths: {
			// 		root: paths.root,
			// 		directories: [paths.nodeModules, path.join(paths.stratokit, 'webpack'), 'config'],
			// 		// Add your webpack configuration paths here so changes to loader
			// 		// configuration and other details will cause a fresh build to occur.
			// 		files: ['package.json'],
			// 	},
			// }),

			// Only include moment locales for the languages we use
			new webpack.ContextReplacementPlugin(
				/moment[\\/]locale$/,
				new RegExp(`^./(${config.languages.join('|')})$`)
			),

			// TEMPORARY Fix graphiql build warning for now
			// https://github.com/graphql/graphql-language-service/issues/128
			new webpack.ContextReplacementPlugin(
				/graphql-language-service-interface[\\/]dist$/,
				/^\.\/.*\.js$/
			),

			// dll path has to be relative to compiled server code
			useDlls &&
				new webpack.DllReferencePlugin({
					manifest: JSON.parse(fs.readFileSync(dllPath)),
				}),

			// Always produce stats in the output directory, useful for optimization
			new StatsPlugin('_webpack_stats.json', {
				hash: true,
				version: true,
				timings: true,
				assets: true,
				chunks: true,
				chunkModules: true,
				modules: true,
				reasons: true,
				source: false,
			}),

			// Always create _assets.json to map entries to paths
			new AssetsPlugin({
				path: destPath,
				filename: '_assets.json',
				entrypoints: true,
			}),

			// Remove old build files after build
			new CleanupPlugin({exclude: ['_*']}),
		].filter(Boolean),

		externals: [],
	}
	if (isServer) {
		// Make the build work for node
		cfg.target = 'node'
		// Webpack should not change/mock node globals
		cfg.node = false
		// We don't bundle node modules, because:
		// * they load on demand
		// * they can break the build
		// * they slow down the build by a lot
		cfg.externals = [
			nodeExternals({
				// bundle non-javascript files with extensions, presumably via loaders
				whitelist: [
					/\?/, // anything with queries
					/\.(?!(js|json)$).{1,5}$/i,
					// Only add others if they break the build when not bundled, e.g. es modules
					// Be careful about shared modules like react that would end up with multiple instances, one bundled, one not
					/redux-form/,
				],
			}),
		]
		cfg.output.libraryTarget = 'commonjs2'
	}
	return cfg
}

export default makeBaseWebpackConfig
