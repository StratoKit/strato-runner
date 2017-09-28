import config from './config'
import startTranspile from './transpile/startTranspile'

export const registry = {}

const registerPlugin = (name, plugin) => {
	if (name === 'default') {
		throw new Error('"default" is a reserved plugin name')
	}
	const prev = registry[name]
	if (prev) {
		// this doesn't work for promises, ah well
		if (prev.version !== plugin.version)
			throw new Error(
				`Plugin "${name}" is registered twice, v${prev.version} vs v${plugin.version}`
			)
		return
	}
	registry[name] = plugin
}
export const registerPlugins = (plugins, forceName) => {
	if (!plugins) return
	if (Array.isArray(plugins)) {
		for (const p of plugins) {
			registerPlugins(p)
		}
	} else if (typeof plugins.name === 'string') {
		// Plugin
		// TODO verify other keys, share code with configure promised
		registerPlugin(forceName || plugins.name, plugins)
	} else if (typeof plugins.then === 'function') {
		// Promise for plugin
		if (forceName) {
			registerPlugin(forceName, plugins)
		} else {
			throw new Error(
				'Can only use a Promise for a plugin in {pluginName: <Promise for plugin "pluginName">} form'
			)
		}
	} else if (typeof plugins === 'object') {
		for (const name of Object.keys(plugins)) {
			registerPlugins(plugins[name], name)
		}
	} else {
		throw new Error(`Not a plugin registration: ${JSON.stringify(plugins)}`)
	}
}

// TODO under webpack, expect user plugin registry in global
// TODO use NODE_CONFIG_DIR like confippet does
if (config.babel.transpilePlugins) {
	startTranspile(config.babel.options)
}
let userPlugins
try {
	// Optionally, the user can require plugins in `config/plugins.js`
	// If under webpack, this is part of the entry, and if not it will be run only once
	userPlugins = require(process.cwd() + '/config/plugins')
	userPlugins = (userPlugins && userPlugins.default) || userPlugins
} catch (err) {
	if (
		!(err.code === 'MODULE_NOT_FOUND' && /.config.plugins'/.test(err.message))
	) {
		throw err
	}
}

if (userPlugins) {
	registerPlugins(userPlugins)
}

export default registry
