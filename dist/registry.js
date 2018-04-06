'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.registerPlugins = undefined;

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _startTranspile = require('./transpile/startTranspile');

var _startTranspile2 = _interopRequireDefault(_startTranspile);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const dbg = (0, _debug2.default)('stratokit/registry');
const registry = {};

const registerPlugin = (name, plugin) => {
	if (name === 'default') {
		throw new Error('"default" is a reserved plugin name');
	}
	const prev = registry[name];
	if (prev) {
		// this doesn't work for promises, ah well
		if (prev.version !== plugin.version) throw new Error(`Plugin "${name}" is registered twice, v${prev.version} vs v${plugin.version}`);
		return;
	}
	dbg(`registering plugin '${name}'`);
	registry[name] = plugin;
};
const registerPlugins = exports.registerPlugins = (plugins, forceName) => {
	if (!plugins) return;
	if (Array.isArray(plugins)) {
		for (const p of plugins) {
			registerPlugins(p);
		}
	} else if (typeof plugins.name === 'string') {
		// Plugin
		// TODO verify other keys, share code with configure promised
		registerPlugin(forceName || plugins.name, plugins);
	} else if (typeof plugins.then === 'function') {
		// Promise for plugin
		if (forceName) {
			registerPlugin(forceName, plugins);
		} else {
			throw new Error('Can only use a Promise for a plugin in {pluginName: <Promise for plugin "pluginName">} form');
		}
	} else if (typeof plugins === 'object') {
		for (const name of Object.keys(plugins)) {
			registerPlugins(plugins[name], name);
		}
	} else {
		throw new Error(`Not a plugin registration: ${JSON.stringify(plugins)}`);
	}
};

// TODO under webpack, expect user plugin registry in global
// TODO use NODE_CONFIG_DIR like confippet does
if (_config2.default.babel.transpilePlugins) {
	(0, _startTranspile2.default)(_config2.default.babel.options);
}

// Optionally, the user can require plugins in `/plugins`
// If under webpack, this is aliased to _stratokit_plugins
let pluginsPath;

try {
	pluginsPath = require.resolve('_stratokit_plugins');
} catch (err) {
	if (err.code !== 'MODULE_NOT_FOUND') throw err;

	try {
		pluginsPath = require.resolve(process.cwd() + '/plugins');
	} catch (err) {
		if (err.code !== 'MODULE_NOT_FOUND') throw err;
	}
}

if (pluginsPath) {
	dbg(`loading plugins from ${pluginsPath}`);
	const userPlugins = require(pluginsPath);
	registerPlugins(userPlugins && userPlugins.default || userPlugins);
}

exports.default = registry;
//# sourceMappingURL=registry.js.map