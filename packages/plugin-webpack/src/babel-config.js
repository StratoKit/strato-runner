// keep up to date from https://github.com/facebookincubator/create-react-app/blob/master/packages/babel-preset-react-app/index.js

const path = require('path')
const debug = require('debug')
const dbg = debug('stratokit/babel')

const isDev = process.env.NODE_ENV !== 'production'

module.exports = function(context, opts) {
	if (opts == null) {
		opts = {}
	}
	opts.isDev = isDev
	// Workaround to force browser build when webpack config already loaded babel and can't change options
	opts.isBrowser = opts.isBrowser || !!process.env.BROWSER
	opts.esmodules = opts.esmodules || !!process.env.ESMODULES
	const chromeOnly = process.env.CHROME_ONLY === 'true'
	dbg('Babel config', JSON.stringify(opts))
	const {reactHot, noModules, inWebpack, esmodules} = opts
	const plugins = [
		// Cherrypick lodash methods until https://github.com/webpack/webpack/issues/1750
		!isDev && require.resolve('babel-plugin-lodash'),
		// Provide meta-data for import()s
		require.resolve('react-imported-component/babel'),
		// work with aliases, not necessary when running from webpack
		!inWebpack && [
			require.resolve('babel-plugin-webpack-alias'),
			{config: path.join(__dirname, 'aliases.js')},
		],

		// Adds consistent names to styles
		[
			require.resolve('babel-plugin-styled-components'),
			// Don't minify or preprocess, it breaks our stuff
			{displayName: isDev, pure: true, minify: false},
		],

		// Plugins from create-react-app
		// Adds component stack to warning messages
		isDev && require.resolve('@babel/plugin-transform-react-jsx-source'),
		// Adds __self attribute to JSX which React will use for some warnings
		isDev && require.resolve('@babel/plugin-transform-react-jsx-self'),
		// stage 2, but correct one doesn't work yet - HAS TO COME BEFORE class-properties
		[require.resolve('@babel/plugin-proposal-decorators'), {legacy: true}],
		// class { handleClick = () => { } }
		require.resolve('@babel/plugin-proposal-class-properties'),
		// { ...todo, completed: true }
		require.resolve('@babel/plugin-proposal-object-rest-spread'),
		// Support import() syntax
		require.resolve('@babel/plugin-syntax-dynamic-import'),
		// Accessing deeply nested properties: { obj?.foo?.bar?.baz }
		require.resolve('@babel/plugin-proposal-optional-chaining'),

		// Support for HMR - keep below transform-regenerator
		// https://github.com/gaearon/react-hot-loader/issues/391
		reactHot && [require.resolve('react-hot-loader/babel')],
	].filter(Boolean)

	const presets = [
		// Latest stable ECMAScript features
		// But turn off modules so webpack can handle them
		// in dev, compile for our dev targets only
		[
			require.resolve('@babel/preset-env'),

			{
				targets: opts.isBrowser
					? esmodules
						? // Browsers that support <script module=.../>
						  {esmodules: true}
						: chromeOnly
						? {browsers: ['last 1 Chrome version']}
						: {browsers: ['> 0.5% in BE', 'IE >= 11', 'Safari >= 9.1']}
					: // Default to node 10.15.3 in prod; nixpkgs-stable
					  {node: isDev ? true : '10.15.3'},
				// this is either `false` or `undefined`
				modules: !noModules && undefined,
				useBuiltIns: isDev ? undefined : 'entry',
				debug: process.env.NODE_ENV !== 'test',
			},
		],
		// JSX, Flow
		require.resolve('@babel/preset-react'),
		// This crashes on build :(
		// !isDev && require.resolve('babel-preset-minify'),
	].filter(Boolean)

	return {
		presets,
		plugins,
	}
}
