'use strict';

/* global __IN_WEBPACK__ */
/* eslint-disable no-var */
// Support YAML require(), thanks to https://github.com/rudiculous/node-register-yaml/blob/master/index.js

// We use YAML directly instead of converting to JSON because YAML can store more than JSON
// like regexes and comments.
// Besides, we already include it for confippet

if (typeof __IN_WEBPACK__ === 'undefined' && require.extensions) {
	var fs = require('fs');
	var yaml = require('js-yaml');

	var loadFile = function (module, filename) {
		module.exports = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'));
	};
	require.extensions['.yaml'] = loadFile;
	require.extensions['.yml'] = loadFile;
}
//# sourceMappingURL=register-yaml.js.map