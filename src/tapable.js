// inspired by the Webpack tapable library

/** A `hook` that can be `tap`ped for easy extensibility */
export class Hook {
	/**
	 * Create a hook
	 * @param {string[]} [args=[]] - the arguments that the taps will be called with
	 * @param {string} [name] - the name of this hook
	 */
	constructor(args = [], name) {
		this._name = name
		this._args = args
		this.taps = []
		this._async = false
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
	 * @param {fn} fn - the function that will be called
	 */
	tap(name, fn) {
		if (process.env.NODE_ENV !== 'production') {
			const prev = this.taps.find(t => t.name === name)
			if (prev)
				// eslint-disable-next-line no-console
				console.error(`!!! Hook ${this.name} tap: ${name} was already added!`)
		}
		this.taps.push([name, fn])
	}

	/**
	 * Add an async `tap` - marks the Hook async, otherwise identical to `.tap`
	 * @param {string} name - the name of the tap, should be unique
	 * @param {fn} fn - the function that will be awaited
	 */
	tapAsync(name, fn) {
		this._async = true
		this._fName = null
		this.tap(name, fn)
	}

	/**
	 * remove a `tap`
	 * @param {fn} fn - the function that will be removed
	 */
	untap(fn) {
		const idx = this.taps.findIndex(t => t.fn === fn)
		if (idx >= 0) this.taps.splice(idx, 1)
	}

	/**
	 * Replace a `tap` - useful for hot reloading.
	 * Can be used for async taps as well
	 * @param {string} name - the name of the tap, should be unique
	 * @param {fn} fn - the function that will be called
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
		for (const [name, fn] of this.taps) {
			try {
				fn(...args)
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(`Hook ${this.name}: ${name} threw`, error)
				throw error
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
		for (const [name, fn] of this.taps) {
			try {
				// eslint-disable-next-line no-await-in-loop
				await fn(...args)
			} catch (error) {
				// eslint-disable-next-line no-console
				console.error(`Hook ${this.name}: ${name} threw`, error)
				throw error
			}
		}
	}

	/**
	 * await all taps in parallel
	 * @param {...any} args - the arguments each tap will be called with
	 * @returns {Promise} the Promise for completion
	 * @throws as soon as a tap throws but doesn't wait for running calls
	 */
	async callParallel(...args) {
		this._testArgs(args)
		return Promise.all(
			this.taps.map(async t => {
				try {
					await t.fn(...args)
				} catch (error) {
					// eslint-disable-next-line no-console
					console.error(`Hook ${this.name}: ${name} threw`, error)
					throw error
				}
			})
		)
	}

	// we could also do map, callReverse callUntil etc

	/** clear all taps */
	reset() {
		this.taps = []
	}
}

/** Same as Hook but marks the Hook async from the start */
export class AsyncHook extends Hook {
	constructor(...args) {
		super(...args)
		this._async = true
	}
}

// Compatibility with webpack's tapable
export const SyncHook = Hook

export class AsyncSeriesHook extends Hook {
	tapPromise(...args) {
		return this.tap(...args)
	}

	promise(...args) {
		return this.callAsync(...args)
	}
}
