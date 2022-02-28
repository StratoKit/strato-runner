"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = void 0;

require("core-js/modules/es.promise.js");

require("core-js/modules/es.array.iterator.js");

var _debug = _interopRequireDefault(require("debug"));

var _config = _interopRequireDefault(require("./config"));

var _registry = _interopRequireDefault(require("./registry"));

var _finalize = _interopRequireDefault(require("./config/finalize"));

const _excluded = ["name", "version", "config", "requires", "load", "start", "stop", "configured", "loaded", "started"];

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _objectWithoutProperties(source, excluded) { if (source == null) return {}; var target = _objectWithoutPropertiesLoose(source, excluded); var key, i; if (Object.getOwnPropertySymbols) { var sourceSymbolKeys = Object.getOwnPropertySymbols(source); for (i = 0; i < sourceSymbolKeys.length; i++) { key = sourceSymbolKeys[i]; if (excluded.indexOf(key) >= 0) continue; if (!Object.prototype.propertyIsEnumerable.call(source, key)) continue; target[key] = source[key]; } } return target; }

function _objectWithoutPropertiesLoose(source, excluded) { if (source == null) return {}; var target = {}; var sourceKeys = Object.keys(source); var key, i; for (i = 0; i < sourceKeys.length; i++) { key = sourceKeys[i]; if (excluded.indexOf(key) >= 0) continue; target[key] = source[key]; } return target; }

const dbg = (0, _debug.default)('stratokit');
const plugins = {};

const getPluginFromRegistry = async entry => {
  let plugin = _registry.default[entry];

  if (!plugin) {
    throw new TypeError(`no plugin with the name "${entry}" is registered`);
  }

  if (plugin.then) {
    plugin = await plugin;

    if (!plugin || typeof plugin.name !== 'string') {
      throw new TypeError(`Promise for plugin "${entry}" did not yield a plugin`);
    }

    _registry.default[entry] = plugin;
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
          rest = _objectWithoutProperties(plugin, _excluded);

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
  plugin.configuring = true; // Height-first, so the plugin loaded first gets to set the value

  if (plugin.config) _config.default._$.defaults(plugin.config);
  if (plugins[plugin.name]) throw new TypeError(`naming conflict, there can only be one plugin named "${plugin.name}`);
  plugins[plugin.name] = plugin; // TODO getRequires(plugin) that can call a function with the config

  const {
    requires = []
  } = plugin;

  for (const name of requires) {
    const dep = await getPluginFromRegistry(name);
    await configureRecurse(dep);
  }

  delete plugin.configuring;
  plugin.configured = true;
};

const configure = async plugin => {
  await configureRecurse(plugin);
  (0, _finalize.default)(_config.default);
};

const loadRecurse = async plugin => {
  if (plugin.loaded) return;
  const {
    requires = []
  } = plugin;

  for (const name of requires) {
    await loadRecurse(plugins[name]);
  }

  if (plugin.load) {
    dbg(`loading plugin ${plugin.name}`);
    await plugin.load({
      config: _config.default,
      plugin,
      plugins
    });
  }

  plugin.loaded = true;
};

const startRecurse = async plugin => {
  if (plugin.started) return;
  const {
    requires = []
  } = plugin;

  for (const name of requires) {
    await startRecurse(plugins[name]);
  }

  if (plugin.start) {
    dbg(`starting plugin ${plugin.name}`);
    await plugin.start({
      config: _config.default,
      plugin,
      plugins
    });
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
    await plugin.stop({
      config: _config.default,
      plugin
    });
  }

  delete plugin.started;
  const {
    requires = []
  } = plugin;
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
  config: _config.default,
  plugins,
  registry: _registry.default,
  configure,
  load,
  start,
  stop
};
var _default = stratokit;
exports.default = _default;
//# sourceMappingURL=index.js.map