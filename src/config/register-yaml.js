// Support YAML require(), thanks to https://github.com/rudiculous/node-register-yaml/blob/master/index.js
if (typeof __IN_WEBPACK__ === 'undefined' && require.extensions) {
	var fs = require('fs')
	var yaml = require('js-yaml')

	function loadFile(module, filename) {
		module.exports = yaml.safeLoad(fs.readFileSync(filename, 'utf-8'))
	}
	require.extensions['.yaml'] = loadFile
	require.extensions['.yml'] = loadFile
}
