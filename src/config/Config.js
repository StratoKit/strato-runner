// configs[] keeps all configurations with their location
// locations are unique
import sysPath from 'path'
import defaults from './defaults'
import getDefaultOps from './getDefaultOps'

const tryLoadFromProject = path => {
	let mod
	const req = global.__non_webpack_require__ || require
	try {
		mod = [path, req(sysPath.resolve(path))]
	} catch (err) {
		if (err.code !== 'MODULE_NOT_FOUND') throw err
	}
	return mod
}

const isScalar = obj => !obj || typeof obj !== 'object' || Array.isArray(obj)

// TODO move these into the class
const handleOp = (
	obj,
	opCache,
	configs,
	ops,
	parts,
	cIndex,
	pIndex,
	depth = 0
) => {
	if (isScalar(obj)) return obj
	let key,
		count = 0
	for (key in obj) if (++count > 1) return obj
	if (count === 0) return obj
	if (key[0] !== '$') return obj
	const path = parts.slice(0, pIndex + 1).join('.')
	const location = configs[cIndex][0]
	const cacheKey = `${location} ${path}`
	if (cacheKey in opCache) return opCache[cacheKey]
	const op = key.slice(1)
	// Escape $
	if (op[0] === '$') return {[op]: obj[key]}
	if (!ops[op])
		throw new Error(
			`Unknown config op ${JSON.stringify(obj)} at ${configs[cIndex][0]}`
		)
	if (depth > 200)
		throw new Error(
			`Op ${JSON.stringify(obj)} at ${configs[cIndex][0]} recurses too deep`
		)
	const getPrevValue = () =>
		// TODO this should be deeply resolved value
		getConfigVal(opCache, configs, parts, cIndex + 1, pIndex)
	const result = ops[op].op({value: obj, getPrevValue, config, path, location})
	const out = handleOp(
		result,
		opCache,
		configs,
		ops,
		parts,
		cIndex,
		pIndex,
		depth + 1
	)
	opCache[cacheKey] = out
	return out
}

const getConfigVal = (opCache, configs, ops, parts, cIndex, pIndex) => {
	let val = configs[cIndex][1]
	const maxI = parts.length
	let i = 0
	while (i < maxI) {
		const key = parts[i]
		if (!(key in val)) return
		val = handleOp(val[key], opCache, configs, ops)
	}
	if (!val || typeof val !== 'object' || Array.isArray(val)) {
		if (i === maxI - 1) return val
		return null
	}
}

const getAllShallowVals = (opCache, configs, ops, parts, cIndex, pIndex) => {
	let all
	for (; cIndex < configs.length; ++cIndex) {
		const value = getConfigVal(opCache, configs, ops, parts, cIndex, pIndex)
		if (typeof value !== 'undefined') {
			if (isScalar(value)) return all
			if (!all) all = value
		}
	}
}

class Config {
	constructor({NODE_ENV = 'development'} = {}) {
		// TODO handle environment configs in node plugin
		// TODO add/remove configs
		// TODO priority on configs - just config count if none given (higher number wins)
		this.configs = []
		this.env = NODE_ENV
	}

	getConfigs() {
		const defaultOps = getDefaultOps(configs)
		const configs = [
			tryLoadFromProject(`./config/local`),
			tryLoadFromProject(`./config/${this.env}`),
			tryLoadFromProject(`./config`),
			...this.configs,
			['defaults', defaults],
		].filter(c => c && c[1])
		const ops = configs.reduce((o, c) => {
			const newOps = c[1]._ops
			return newOps ? {...newOps, ...o} : o
		}, defaultOps)
		// TODO hot reload handling, caching
		return {configs, ops}
	}

	addConfig(location, config) {
		if (
			process.env.NODE_ENV !== 'production' &&
			configs.some(c => c[0] === location)
		)
			throw new Error(`Config location ${location} was already added`)
		this.configs.unshift([location, config])
	}

	get(path) {
		const {configs, ops} = this.getConfigs()
		const parts = path ? path.split('.') : []
		const cache = {}
		return getVal(cache, configs, ops, parts, 0, 0)
	}
}

export default Config
