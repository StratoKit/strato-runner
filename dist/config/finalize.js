'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
// Load the user configuration and post-process

const path = require('path');
const processConfig = require('./processConfig');

const finalize = config => {
	const options = {
		// used in template expansion, you can also place functions here
		context: {
			deployment: process.env.NODE_ENV || 'development',
			instance: process.env.NODE_APP_INSTANCE,
			ifFalsy: ({ params }) => params[0] || params[1],
			ifTruthy: ({ params }) => params[0] && params[1],

			// Allow config to call require()
			// This works in the scope of this file, so only use global requires
			// If stratokit is part of a webpack bundle, you first need to grab the global
			// require from the bundle using an external like `{realReq: 'var require'}`
			require: ({ params, resolve }) => require(path.join(params.map(resolve)))
		}
	};
	const missing = processConfig(config, options);

	if (missing.length) {
		// eslint-disable-next-line no-console
		console.error('!!! These config templates could not be expanded:', missing);
	}
};

exports.default = finalize;
//# sourceMappingURL=finalize.js.map