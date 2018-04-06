'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _path = require('path');

var _path2 = _interopRequireDefault(_path);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

exports.default = {
	name: 'run',
	version: '0.0.1',
	start: ({ config }) => {
		for (const name of config.run) {
			const toRun = config.entries[name];
			if (toRun) {
				if (Array.isArray(toRun)) {
					toRun.forEach(f => require(_path2.default.resolve(config.paths.root, f)));
				} else {
					require(toRun);
				}
			} else {
				require(name);
			}
		}
	}
};
//# sourceMappingURL=index.js.map