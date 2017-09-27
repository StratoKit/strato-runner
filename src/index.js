import debug from 'debug'
import config from './config'
import registry from './registry'
import finalize from './config/finalize'

const dbg = debug('stratokit')

const plugins = {}

const getPluginFromRegistry = async entry => {
	let plugin = registry[entry]
	if (!plugin) {
		throw new TypeError(`no plugin with the name "${entry}" is registered`)
	}
	if (plugin.then) {
		plugin = await plugin
		if (!plugin || typeof plugin.name !== 'string') {
			throw new TypeError(
				`Promise for plugin "${entry}" did not yield a plugin`
			)
		}
		registry[entry] = plugin
	}
	if (process.env.NODE_ENV !== 'production') {
		const {
			name,
			version,
			config,
			requires,
			load,
			start,
			stop,
			configured,
			loaded,
			started,
			...rest
		} = plugin
		const keys = Object.keys(rest)
		if (keys.length) {
			throw new TypeError(
				`Plugin ${entry} has these unknown keys: ${keys.join(' ')}`
			)
		}
	}
	return plugin
}

const configureRecurse = async plugin => {
	if (plugin.configured) return

	if (plugin.configuring)
		throw new TypeError(`circular dependency configuring "${plugin.name}`)

	plugin.configuring = true

	// Height-first, so the plugin loaded first gets to set the value
	if (plugin.config) config._$.defaults(plugin.config)

	if (plugins[plugin.name])
		throw new TypeError(
			`naming conflict, there can only be one plugin named "${plugin.name}`
		)

	plugins[plugin.name] = plugin

	const {requires = []} = plugin
	for (const name of requires) {
		const dep = await getPluginFromRegistry(name)
		await configureRecurse(dep)
	}

	delete plugin.configuring
	plugin.configured = true
}

const configure = async plugin => {
	await configureRecurse(plugin)
	finalize(config)
}

const loadRecurse = async plugin => {
	if (plugin.loaded) return

	const {requires = []} = plugin
	for (const name of requires) {
		await loadRecurse(plugins[name])
	}

	if (plugin.load) {
		dbg(`loading plugin ${plugin.name}`)
		await plugin.load({config, plugin})
	}

	plugin.loaded = true
}

const startRecurse = async plugin => {
	if (plugin.started) return

	const {requires = []} = plugin
	for (const name of requires) {
		await startRecurse(plugins[name])
	}

	if (plugin.start) {
		dbg(`starting plugin ${plugin.name}`)
		await plugin.start({config, plugin})
	}
	plugin.started = true
}

const load = async plugin => {
	await configure(plugin)
	await loadRecurse(plugin)
	return plugin
}

const start = async entry => {
	const plugin = await getPluginFromRegistry(entry)
	await load(plugin)
	await startRecurse(plugin)
}

const stopRecurse = async plugin => {
	if (!plugin.started) return

	if (plugin.stop) {
		dbg(`stopping plugin ${plugin.name}`)
		await plugin.stop({config, plugin})
	}
	delete plugin.started

	const {requires = []} = plugin
	const revReqs = [...requires].reverse()
	for (const name of revReqs) {
		await stopRecurse(plugins[name])
	}
}

const stop = async entry => {
	const plugin = plugins[entry]
	if (!plugin) {
		throw new Error(`plugin ${entry} was not found/started`)
	}
	await stopRecurse(plugin)
}

const stratokit = {
	config,
	plugins,
	registry,
	configure,
	load,
	start,
	stop,
}

export default stratokit
