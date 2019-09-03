/* global __IN_WEBPACK__ */
/* eslint-disable no-var */
// Support YAML require(), thanks to https://github.com/rudiculous/node-register-yaml/blob/master/index.js

// We use YAML directly instead of converting to JSON because YAML can store more than JSON
// like regexes and comments.

if (typeof __IN_WEBPACK__ === 'undefined' && require.extensions) {
	var fs = require('fs')
	var yaml
	try {
		yaml = require('js-yaml')
	} catch (err) {
		if (err.code === 'MODULE_NOT_FOUND') {
			// eslint-disable-next-line no-console
			console.error('To support Yaml loading, install js-yaml in your project')
		}
		throw err
	}

	var loadFile = function(module, filename) {
		module.exports = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'))
	}
	require.extensions['.yaml'] = loadFile
	require.extensions['.yml'] = loadFile
}
