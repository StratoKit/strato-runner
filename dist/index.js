'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _debug = require('debug');

var _debug2 = _interopRequireDefault(_debug);

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _registry = require('./registry');

var _registry2 = _interopRequireDefault(_registry);

var _finalize = require('./config/finalize');

var _finalize2 = _interopRequireDefault(_finalize);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(obj, keys) { var target = {}; for (var i in obj) { if (keys.indexOf(i) >= 0) continue; if (!Object.prototype.hasOwnProperty.call(obj, i)) continue; target[i] = obj[i]; } return target; } /* eslint-disable no-await-in-loop */


const dbg = (0, _debug2.default)('stratokit');

const plugins = {};

const getPluginFromRegistry = async entry => {
	let plugin = _registry2.default[entry];
	if (!plugin) {
		throw new TypeError(`no plugin with the name "${entry}" is registered`);
	}
	if (plugin.then) {
		plugin = await plugin;
		if (!plugin || typeof plugin.name !== 'string') {
			throw new TypeError(`Promise for plugin "${entry}" did not yield a plugin`);
		}
		_registry2.default[entry] = plugin;
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
			started
		} = plugin,
		      rest = _objectWithoutProperties(plugin, ['name', 'version', 'config', 'requires', 'load', 'start', 'stop', 'configured', 'loaded', 'started']);
		const keys = Object.keys(rest);
		if (keys.length) {
			throw new TypeError(`Plugin ${entry} has these unknown keys: ${keys.join(' ')}`);
		}
	}
	return plugin;
};

const configureRecurse = async plugin => {
	if (plugin.configured) return;

	if (plugin.configuring) throw new TypeError(`circular dependency configuring "${plugin.name}`);

	plugin.configuring = true;

	// Height-first, so the plugin loaded first gets to set the value
	if (plugin.config) _config2.default._$.defaults(plugin.config);

	if (plugins[plugin.name]) throw new TypeError(`naming conflict, there can only be one plugin named "${plugin.name}`);

	plugins[plugin.name] = plugin;

	const { requires = [] } = plugin;
	for (const name of requires) {
		const dep = await getPluginFromRegistry(name);
		await configureRecurse(dep);
	}

	delete plugin.configuring;
	plugin.configured = true;
};

const configure = async plugin => {
	await configureRecurse(plugin);
	(0, _finalize2.default)(_config2.default);
};

const loadRecurse = async plugin => {
	if (plugin.loaded) return;

	const { requires = [] } = plugin;
	for (const name of requires) {
		await loadRecurse(plugins[name]);
	}

	if (plugin.load) {
		dbg(`loading plugin ${plugin.name}`);
		await plugin.load({ config: _config2.default, plugin, plugins });
	}

	plugin.loaded = true;
};

const startRecurse = async plugin => {
	if (plugin.started) return;

	const { requires = [] } = plugin;
	for (const name of requires) {
		await startRecurse(plugins[name]);
	}

	if (plugin.start) {
		dbg(`starting plugin ${plugin.name}`);
		await plugin.start({ config: _config2.default, plugin, plugins });
	}
	plugin.started = true;
};

const load = async plugin => {
	await configure(plugin);
	await loadRecurse(plugin);
	return plugin;
};

const start = async entry => {
	const plugin = await getPluginFromRegistry(entry);
	await load(plugin);
	await startRecurse(plugin);
};

const stopRecurse = async plugin => {
	if (!plugin.started) return;

	if (plugin.stop) {
		dbg(`stopping plugin ${plugin.name}`);
		await plugin.stop({ config: _config2.default, plugin });
	}
	delete plugin.started;

	const { requires = [] } = plugin;
	const revReqs = [...requires].reverse();
	for (const name of revReqs) {
		await stopRecurse(plugins[name]);
	}
};

const stop = async entry => {
	const plugin = plugins[entry];
	if (!plugin) {
		throw new Error(`plugin ${entry} was not found/started`);
	}
	await stopRecurse(plugin);
};

const stratokit = {
	config: _config2.default,
	plugins,
	registry: _registry2.default,
	configure,
	load,
	start,
	stop
};

exports.default = stratokit;
//# sourceMappingURL=index.js.map