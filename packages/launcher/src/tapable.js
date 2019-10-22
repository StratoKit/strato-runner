// inspired by the Webpack tapable library
import debug from 'debug'

const dbg = debug('tapable')

/** A `hook` that can be `tap`ped for easy extensibility */
export class Hook {
	/**
	 * Create a hook
	 * @param {string[]} [args=[]] - the arguments that the taps will be called with
	 * @param {string} [name] - the name of this hook
	 */
	constructor(args = [], name = 'someHook') {
		this._name = name
		this._args = args
		/** @type {{ name: string; fn: Function; }[]} */
		this.taps = []
		this._async = false
		this._fName = null
		dbg('Hook %s created', this.name)
	}

	/**
	 * A pretty name for the hook, for debugging
	 * @return {string} the name
	 */
	get name() {
		if (!this._fName)
			this._fName = `${this._async ? 'async ' : ''}${
				this._name
			}(${this._args.join(', ')})`
		return this._fName
	}

	/**
	 * Is there an async tap attached?
	 * @returns {boolean}
	 */
	get isAsync() {
		return this._async
	}

	_handleError(name, error) {
		if (error?.message) {
			error.message = `Hook ${this.name} tap ${name}: ${error.message}`
			throw error
		} else {
			throw new Error(`Hook ${this.name} tap ${name} errored: ${String(error)}`)
		}
	}

	_testArgs(args, isSync) {
		if (process.env.NODE_ENV === 'production') return
		if (this._async && isSync)
			throw new Error(
				`${this.name}: async hook cannot be called sync (maybe one of the taps is async?)`
			)
		if (args.length !== this._args.length)
			// eslint-disable-next-line no-console
			console.error(
				`!!! Hook ${this.name}: called with ${args.length} instead of ${this._args.length}`
			)
	}

	/**
	 * add a `tap`
	 * @param {string} name - the name of the tap, should be unique
	 * @param {function} fn - the function that will be called
	 * @param {{before?: string, after?: string}} [options]
	 */
	tap(name, fn, options) {
		if (process.env.NODE_ENV !== 'production') {
			const prev = this.taps.find(t => t.name === name)
			if (prev)
				// eslint-disable-next-line no-console
				console.error(`!!! Hook ${this.name} tap: ${name} was already added!`)
		}
		const tap = {name, fn}
		dbg('%s: Adding tap %s %o', this.name, name, options)
		if (options?.before) {
			const index = this.taps.findIndex(t => t.name === options.before)
			if (index !== -1) {
				this.taps.splice(index, 0, tap)
				return
			}
		}
		if (options?.after) {
			const index = this.taps.findIndex(t => t.name === options.after)
			if (index !== -1) {
				this.taps.splice(index + 1, 0, tap)
				return
			}
		}
		this.taps.push(tap)
	}

	/**
	 * Add an async `tap` - marks the Hook async, otherwise identical to `.tap`
	 * @param {string} name - the name of the tap, should be unique
	 * @param {function} fn - the function that will be awaited
	 * @param {{before?: string, after?: string}} [options]
	 */
	tapAsync(name, fn, options) {
		this._async = true
		this._fName = null
		this.tap(name, fn, options)
	}

	/**
	 * remove a `tap`
	 * @param {function} fn - the function that will be removed
	 */
	untap(fn) {
		const idx = this.taps.findIndex(t => t.fn === fn)
		if (idx >= 0) this.taps.splice(idx, 1)
	}

	/**
	 * Replace a `tap` - useful for hot reloading.
	 * Can be used for async taps as well
	 * @param {string} name - the name of the tap, should be unique
	 * @param {function} fn - the function that will be called
	 */
	retap(name, fn) {
		const tap = this.taps.find(t => t.name === name)
		if (tap) {
			tap.fn = fn
		} else {
			// eslint-disable-next-line no-console
			console.error(`!!! Hook ${this.name} retap: ${name} was not added yet!`)
			this.tap(name, fn)
		}
	}

	/**
	 * call all taps in added order
	 * @param {...any} args - the arguments each tap will be called with
	 * @throws as soon as a tap throws
	 */
	call(...args) {
		this._testArgs(args, true)
		dbg('%s.call%o', this.name, args)
		for (const {name, fn} of this.taps) {
			try {
				fn(...args)
			} catch (error) {
				this._handleError(name, error)
			}
		}
	}

	/**
	 * await all taps in added order
	 * @param {...any} args - the arguments each tap will be called with
	 * @returns {Promise} the Promise for completion
	 * @throws as soon as a tap throws
	 */
	async callAsync(...args) {
		this._testArgs(args)
		dbg('%s.callAsync%o', this.name, args)
		for (const {name, fn} of this.taps) {
			try {
				// eslint-disable-next-line no-await-in-loop
				await fn(...args)
			} catch (error) {
				this._handleError(name, error)
			}
		}
	}

	/**
	 * call all taps in added order and return their results
	 * @param {...any} args - the arguments each tap will be called with
	 * @throws as soon as a tap throws
	 * @returns {array}
	 */
	map(...args) {
		this._testArgs(args, true)
		dbg('%s.map%o', this.name, args)
		const out = []
		for (const {name, fn} of this.taps) {
			try {
				out.push(fn(...args))
			} catch (error) {
				this._handleError(name, error)
			}
		}
		return out
	}

	/**
	 * await all taps in parallel
	 * @param {...any} args - the arguments each tap will be called with
	 * @returns {Promise<array>} the Promise for the completed array
	 * @throws as soon as a tap throws but doesn't wait for running calls
	 */
	async mapAsync(...args) {
		this._testArgs(args)
		dbg('%s.mapAsync%o', this.name, args)
		return Promise.all(
			this.taps.map(async ({name, fn}) => {
				try {
					return await fn(...args)
				} catch (error) {
					this._handleError(name, error)
				}
			})
		)
	}

	// we could also do callReverse, callUntil, reduce etc

	/** clear all taps */
	reset() {
		this.taps = []
	}
}

export const addHook = (hooks, name, args) => {
	if (hooks[name]) throw new Error(`Hook ${name} is already defined`)
	hooks[name] = new Hook(args, name)
}

export const addAsyncHook = (hooks, name, args) => {
	if (hooks[name]) throw new Error(`Hook ${name} is already defined`)
	hooks[name] = new AsyncHook(args, name)
}

/** Same as Hook but marks the Hook async from the start */
export class AsyncHook extends Hook {
	constructor(...args) {
		super(...args)
		this._async = true
		this._fName = null
	}
}
