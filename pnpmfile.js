const babelCoreVersion = 'bridge'
const babelRuntimeVersion = 'next' //'7.0.0-beta.3'
const regenVersion = '<0.13'
const readPackage = (pkg, context) => {
	// Fix Jest dependencies on babel
	const core = pkg.dependencies && pkg.dependencies['babel-core']
	const runtime = pkg.dependencies && pkg.dependencies['babel-runtime']
	const regen = pkg.dependencies && pkg.dependencies['regenerator-runtime']
	if (/^.?6/.test(core)) {
		pkg.dependencies['babel-core'] = babelCoreVersion
		context.log(
			`replacing ${pkg.name}'s babel-core dep ${core} with ${babelCoreVersion}`
		)
	}
	if (/^.?6/.test(runtime)) {
		pkg.dependencies['babel-runtime'] = babelRuntimeVersion
		context.log(
			`replacing ${pkg.name}'s babel-runtime dep ${runtime} with ${babelRuntimeVersion}`
		)
	}
	if (regen && regen !== regenVersion) {
		pkg.dependencies['regenerator-runtime'] = regenVersion
		context.log(
			`replacing ${pkg.name}'s regenerator-runtime dep ${regen} with ${regenVersion} (fix until newer Babel runtime)`
		)
	}
	return pkg
}

module.exports = {hooks: {readPackage}}
