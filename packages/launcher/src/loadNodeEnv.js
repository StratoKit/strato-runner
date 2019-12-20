// TODO when module.hot, mark the configs as dependencies so they reload
import debug from 'debug'

const dbg = debug('stratokit/env')

const getVersion = config => {
	try {
		const pkg = require(require.resolve('./package.json', {
			paths: config.paths.root,
		}))
		return pkg.version
	} catch (err) {
		if (err.code !== 'MODULE_NOT_FOUND') throw err
	}
}

const defaultConfig = {
	paths: {
		root: process.cwd(),
	},
	env: process.env.NODE_ENV || 'development',
	version: getVersion,
}

const tryLoad = (base, path, envConfigs) => {
	const file = `${base}/${path}`
	// Extend with other bundler globals
	// @ts-ignore
	const reqFn = global.__non_webpack_require__ || require
	try {
		let cfg = reqFn(file)
		// We assume that "default" is never a root key in a configuration
		cfg = cfg.default || cfg
		if (typeof cfg !== 'object')
			throw new TypeError(`${file} does not export an object`)
		envConfigs.push(cfg)
		dbg(`loaded %s`, file)
		return true
	} catch (err) {
		if (err.code !== 'MODULE_NOT_FOUND') {
			throw err
		}
		return false
	}
}

const loadAny = (base, path, envConfigs) =>
	tryLoad(base, `${path}`, envConfigs) ||
	tryLoad(base, `${path}.json`, envConfigs)

const loadNodeEnv = ({base = process.cwd(), yaml = false}) => {
	if (yaml) require('./transpile/register-yaml')
	const envConfigs = [defaultConfig]
	dbg(`loading configuration`)
	if (!loadAny(base, 'config', envConfigs)) {
		loadAny(base, 'config/default', envConfigs)
		loadAny(base, `config/${process.env.NODE_ENV || 'development'}`, envConfigs)
		loadAny(base, 'config/local', envConfigs)
	}
	// maybe load more via NODE_CONFIG_DIR_*, something confippet supports
	return envConfigs
}

export default loadNodeEnv
