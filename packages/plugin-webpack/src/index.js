import {registerPlugin} from '@stratokit/launcher'
import config from './config'
import makeWPConfig from './base-config'
import webpack from 'webpack'

// Takes a config and builds it
const build = cfg =>
	new Promise((resolve, reject) => {
		const compiler = webpack(cfg)
		compiler.run((err, stats) => {
			if (err) {
				console.error(err.stack || err)
				if (err.details) {
					console.error('details', err.details)
				}
				return reject(err)
			}

			const info = stats.toJson()

			if (stats.hasErrors()) {
				console.error(info.errors)
			}

			if (stats.hasWarnings()) {
				console.warn(info.warnings)
			}

			console.log(
				stats.toString({
					chunks: false, // Makes the build much quieter
					colors: true, // Shows colors in the console
				})
			)
			return resolve(stats)
		})
	})

// TODO this is a side effect, no good. Instead, export this plugin config and let the caller register the plugin for direct deps and someone else for peer deps. Maybe the requires array can be plugin objects as well as names, and/or load/start accept plugin/plugin array instead of names.
/* something like
	import {buildNode} from '@stratokit/webpack'
	await buildNode(entries, extraConfig)
		=> this loads the webpack plugin with the extraConfig and then builds
		should also add the loadNodeEnv config => node plugin that messes with config load order, putting itself last?
---
	import plugin from '@stratokit/webpack'
	getCompiler = async (makeCfg, extraConfig) => {
		const launcher = await start(plugin, [{webpack: {makeCfg}}, extraConfig, nodeEnv])
		return launcher.plugins.webpack.compiler
	}
---
registerPlugins([reactWebpack])

note that fastify plugins use a helper to massage the plugin https://github.com/fastify/fastify-plugin/blob/master/index.js
	*/
registerPlugin({
	name: 'webpack',
	config,
	load: ({config}) => {
		return {
			makeWPConfig,
			// run,
			build,
		}
	},
})
