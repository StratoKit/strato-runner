import debug from 'debug'

const dbg = debug('stratokit/registry')
const registry = {}

export const registerPlugin = plugin => {
	// todo make object
	const {name} = plugin
	if (name === 'default') {
		throw new Error('"default" is a reserved plugin name')
	}
	const prev = registry[name]
	if (prev) {
		if (prev !== plugin) {
			// note: to hot update, first unregister old plugin
			throw new Error(
				`Plugin "${name}" is registered already, ${JSON.stringify(
					prev
				)} vs incoming ${JSON.stringify(plugin)}. Use unregisterPlugin() first`
			)
		}
		return
	}
	dbg(`registering plugin "${name}"`)
	{
		const {
			name,
			version,
			config,
			requires,
			load,
			start,
			stop,
			unload,
			...rest
		} = plugin
		const keys = Object.keys(rest)
		if (keys.length) {
			throw new TypeError(
				`Plugin ${name} has these unknown keys: ${keys.join(' ')}`
			)
		}
	}
	registry[name] = plugin
}

// This is really only for development
export const unregisterPlugin = plugin => {
	const {name} = plugin
	const prev = registry[name]
	if (prev) {
		if (prev === plugin) {
			dbg(`unregistering plugin "${name}"`)
			delete registry.name
		} else {
			throw new Error(
				`plugin "${name}" is not the same as the one you're unregistering`
			)
		}
	} else {
		dbg(`unregistering plugin "${name}": not registered`)
	}
}

const getPlugin = name => {
	const plugin = registry[name]
	if (!plugin) {
		throw new TypeError(`no plugin with the name "${name}" is registered`)
	}
	return plugin
}

export default getPlugin
