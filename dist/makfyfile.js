'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.commands = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _config = require('./config');

var _config2 = _interopRequireDefault(_config);

var _fsExtra = require('fs-extra');

var _fsExtra2 = _interopRequireDefault(_fsExtra);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

// TODO get combined config of all plugins
const { paths, npm, makfy } = _config2.default;

const commands = exports.commands = _extends({
	startDev: {
		desc: 'Run the server in development mode',
		args: {
			inspect: {
				type: 'flag',
				desc: 'run the dev worker process with the --inspect flag'
			}
		},
		run: async (exec, args, util) => {
			const wpConfPath = util.fixPath(`${paths.stratokit}/webpack/webpack.config.server.babel.js`);
			await exec(util.setEnvVar('NODE_ENV', 'development'), args.inspect && util.setEnvVar('DEBUG_SERVER', 'true'), `webpack --config ${wpConfPath} --watch --color`);
		}
	},

	// TODO importDeps: import deps into config after package updates
	// it's a bit hard because it needs to write into YAML
	// perhaps via an AST editor or by doing search/replace in awk

	// TODO add plugin packages. Since not all plugins are used in all compilation targets,
	// somehow get their dependencies via config but in a way that is not slow when they are not used
	// Perhaps all plugins need registration in the config and only then can be loaded into Stratokit?
	// Their config would have to be restricted to the npm namespace unless they are activated
	writeConfig: {
		desc: 'Write the project configuration (package.json) based on the Stratokit config',
		run: async (exec, _, util) => {
			const pkgPath = util.fixPath(`${paths.root}/package.json`);
			const oldPkg = require(pkgPath);
			const name = _config2.default.appName;
			// TODO add makfy scripts
			const pkg = _extends({}, oldPkg, {
				name
			}, npm);
			// Sort scripts and deps
			const names = ['scripts', 'devDependencies', 'dependencies'];
			names.forEach(name => {
				pkg[name] = {};
				Object.keys(npm[name] || {}).sort().forEach(k => {
					pkg[name][k] = npm[name][k];
				});
			});
			await _fsExtra2.default.writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
			await exec(`? wrote ${pkgPath}`);
		}
	}

}, makfy);
//# sourceMappingURL=makfyfile.js.map