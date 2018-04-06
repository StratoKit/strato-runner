'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

const startTranspile = options => {
	require('babel-register')(_extends({}, options, {
		babelrc: false
	}));
};

exports.default = startTranspile;
//# sourceMappingURL=startTranspile.js.map