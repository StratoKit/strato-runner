/* eslint-disable no-await-in-loop */
import debug from 'debug'
import makeConfig from 'lazy-recursive-merge'
import getPlugin from './registry'

const dbg = debug('stratokit')

class Launcher {
	states = {}

	config = {}

	_configs = []

	_extraConfigs = []

	constructor({extraConfigs = []}) {
		if (extraConfigs && !Array.isArray(extraConfigs)) {
			if (typeof extraConfigs === 'object') {
				extraConfigs = [extraConfigs]
			} else {
				throw new TypeError('extraConfigs parameter should be array or object')
			}
		}
		this._extraConfigs = extraConfigs
	}

	_updateConfig() {
		makeConfig([...this._configs, ...this._extraConfigs], {
			target: this.config,
		})
	}

	_requires = {}

	_configureRecurse(name) {
		if (this._requires[name]) return false
		if (name in this._requires)
			throw new TypeError(`circular dependency configuring "${name}"`)
		this._requires[name] = undefined

		let resolved
		const {config, requires} = getPlugin(name)
		if (config) this._configs.push(config)
		if (requires) {
			if (typeof requires === 'function') {
				this._updateConfig()
				resolved = requires(this.config)
				if (!Array.isArray(resolved))
					throw new TypeError(
						`the requires(config) function of the "${name}" plugin did not return an array but instead ${resolved}`
					)
			} else {
				resolved = requires
			}
			for (const dep of resolved) this._configure(dep)
		} else {
			resolved = []
		}

		this._requires[name] = resolved

		return true
	}

	_configure(name) {
		const changed = this._configureRecurse(name)
		if (changed) this._updateConfig()
	}

	load = async name => {
		if (name in this.states) return
		this._configure(name)

		for (const dep of this._requires[name]) await this.load(dep)
		const {load} = getPlugin(name)
		if (load) {
			dbg(`loading plugin "${name}"`)
			this.states[name] = await load({
				config: this.config,
				states: this.states,
				// TODO allow late load/start, with inserting config before dependant
				// load: this.load,
				// start: this.start,
			})
		} else {
			// mark loaded
			this.states[name] = undefined
		}
	}

	_started = {}

	start = async name => {
		if (this._started[name]) return
		await this.load(name)

		for (const dep of this._requires[name]) await this.start(dep)
		const {start} = getPlugin(name)
		if (start) {
			dbg(`starting plugin "${name}"`)
			const {config, states} = this
			await start({config, state: states[name], states})
		}
		this._started[name] = true
	}

	stop = async name => {
		if (!this._started[name]) return

		const {stop} = getPlugin(name)
		if (stop) {
			dbg(`stopping plugin "${name}"`)
			const {config, states} = this
			await stop({config, state: states[name], states})
		}
		this._started[name] = false
		for (const dep of [...this._requires[name]].reverse()) await this.stop(dep)
	}

	unload = async name => {
		if (!(name in this.states)) return

		const {unload} = getPlugin(name)
		if (unload) {
			dbg(`unloading plugin "${name}"`)
			const {config, states} = this
			await unload({config, state: states[name], states})
		}
		delete this.states[name]
		for (const dep of [...this._requires[name]].reverse())
			await this.unload(dep)
	}
}

export const load = async (name, extraConfigs) => {
	const launcher = new Launcher({extraConfigs})
	await launcher.load(name)
	return launcher
}

export const start = async (name, extraConfigs) => {
	const launcher = new Launcher({extraConfigs})
	await launcher.start(name)
	return launcher
}
