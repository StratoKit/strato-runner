'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
// Everything that Stratokit runs has access to the project configuration
// Here we make sure the config is loaded before the entry point runs
// * Only use require() so that Webpack can track dependencies, don't read files

const confippet = require('electrode-confippet');

// TODO +key merges arrays
const mergeWith = require('lodash/mergeWith');

const { NODE_ENV } = process.env || 'development';

require('../transpile/register-yaml');
const defaults = require('./defaults/default');
try {
	mergeWith(defaults, require(`./defaults/${NODE_ENV}`));
} catch (err) {
	if (err.code !== 'MODULE_NOT_FOUND') {
		throw err;
	}
}

// Load user config with Stratokit defaults
const config = confippet.store();
config._$.defaults(defaults);

// This is code from confippet because it did too much
const dirs = [];
for (let i = 0, dir = ''; dir = process.env[`NODE_CONFIG_DIR_${i}`]; ++i) {
	dirs.push(dir);
}
if (dirs.length > 0 && process.env.NODE_CONFIG_DIR) {
	dirs.push(process.env.NODE_CONFIG_DIR);
}
if (dirs.length > 0) {
	// eslint-disable-next-line no-console
	console.log('config dirs', dirs);
}

// TODO while setting defaults, for all objects targets make sure the config is not `null`
// (prevent yaml empty object overwriting defaults)
config._$.compose({
	dirs: dirs.length > 0 && dirs,
	dir: process.env.NODE_CONFIG_DIR,
	failMissing: false,
	warnMissing: true
});

exports.default = config;
//# sourceMappingURL=index.js.map