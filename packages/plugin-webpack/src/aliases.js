// minimal setup for babel alias plugin
// ES5 only!
const path = require('path')
const confippet = require('electrode-confippet')
const options = {
	dirs: [path.join(process.cwd(), 'lib', 'config-default')],
	failMissing: false,
	warnMissing: false,
	context: {
		deployment: process.env.NODE_ENV,
		instance: process.env.NODE_APP_INSTANCE,
	},
}
const defaults = confippet.store()
defaults._$.compose(options)
const config = confippet.store()
config._$.defaults(defaults)
confippet.presetConfig.load(config, {
	failMissing: false,
	warnMissing: true,
})

if (!config.stratokit) {
	console.error('stratokit config is empty:', config)
	throw new Error(
		'Something went wrong with Babel or Webpack, try removing ~/.babel.json'
	)
}
const alias = {}
Object.keys(config.stratokit.webpack.alias).forEach(k => {
	const a = config.stratokit.webpack.alias[k]
	if (/^[/\\]/.test(a)) {
		// Only include path redirects
		alias[k] = a
	}
})
module.exports = {
	resolve: {
		extensions: ['.js', '.jsx', '.json'],
		alias,
	},
}
