const isPlainObject = o => !!o && typeof o === 'object' && !Array.isArray(o)

const get = (path, object) => {
	let sub = object
	for (const key of path) {
		if (!(sub && typeof sub === 'object' && key in sub)) return [false]
		sub = sub[key]
	}
	return [true, sub]
}

// Takes a vertical slice of values of configs at path
// like extracting an apple core
export const _getCore = (path, configs) =>
	configs
		.map(c => get(path, c))
		.filter(r => r[0])
		.map(r => r[1])

export const _mergeKeys = configs => {
	const allKeys = {}
	for (const config of configs)
		for (const key of Object.keys(config))
			if (!(key in allKeys)) allKeys[key] = true
	return Object.keys(allKeys)
}

// removes non-mergeable values
// TODO merge plain objects without functions
export const _squash = core => {
	const newCore = []
	for (let i = core.length; i; i--) {
		const value = core[i - 1]
		const prev = newCore[0]
		if (typeof value === 'function') {
			newCore.unshift(value)
		} else if (
			isPlainObject(value) &&
			(typeof prev === 'function' || isPlainObject(prev))
		) {
			newCore.unshift(value)
		} else {
			newCore[0] = value
		}
	}
	return newCore
}

const isMergeable = o => typeof o === 'function' || isPlainObject(o)

const setReadOnly = (o, key, value) => {
	Object.defineProperty(o, key, {
		value,
		enumerable: true,
		configurable: true,
		writable: false,
	})
}
const rootMap = new WeakMap()
// merges configs into an object
// target object is made empty - this allows retaining a reference to it
const mergeConfigs = ({configs, path: parentPath = [], target, root}) => {
	if (target) {
		// empty target
		for (const key of Object.keys(target)) delete target[key]
	} else {
		target = {}
	}
	if (!root) root = target

	const allKeys = _mergeKeys(configs)
	for (const key of allKeys) {
		// We only keep track of path for debugging
		const path = [...parentPath, key]
		const core = _squash(_getCore([key], configs))
		if (!isMergeable(core[0])) {
			// a non-mergeable at the top is by definition the only one
			setReadOnly(target, key, core[0])
			continue
		}
		const hasFn = core.some(o => typeof o === 'function')
		if (hasFn) {
			// We need a merging getter for the entire subtree

			const getter = () => {
				// cycle detection
				if (!rootMap.has(target)) {
					rootMap.set(target, new WeakMap())
				}
				const running = rootMap.get(target)
				if (running.has(getter))
					throw new Error(`config: cycle in config.${path.join('.')}`)
				running.set(getter)

				// merge core, resolving functions
				// the stack retains intermediate plain objects to merge
				// merging late allows accessing of intermediate values
				let stack = []
				let result = core.reduceRight((prev, value) => {
					if (typeof value === 'function') {
						if (stack.length) {
							prev = mergeConfigs({configs: stack, path, root})
							stack = []
						}
						try {
							value = value(root, {prev, path})
						} catch (error) {
							running.delete(getter)
							error.message = `config.${path.join('.')}: ${error.message}`
							throw error
						}
						// function result completely replaces anything below
						// any merges have to be done by the function
						prev = undefined
					}

					// set up subtree with getters
					if (isPlainObject(value)) {
						stack.unshift(value)
					} else {
						stack = []
					}
					return value
				}, undefined)
				if (stack.length) result = mergeConfigs({configs: stack, path, root})

				running.delete(getter)

				// only calculate once, store result
				// this allows deeper evaluation without cycles
				setReadOnly(target, key, result)

				return result
			}
			Object.defineProperty(target, key, {
				get: getter,
				enumerable: true,
				configurable: true,
			})
		} else {
			// The core only contains plain objects, merge deeper
			setReadOnly(target, key, mergeConfigs({configs: core, path, root}))
		}
	}
	return target
}

const lazyMerge = (configs, {target} = {}) => {
	// The last config overrides all, but we work from 0 to make things easier
	const reversed = [...configs].reverse()
	return mergeConfigs({configs: reversed, target})
}

export default lazyMerge
