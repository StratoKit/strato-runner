const yaml = require('js-yaml')
const fs = require('fs-extra')

const doYaml = from => {
	const doc = yaml.safeLoad(fs.readFileSync(from, 'utf8'))
	return fs.writeFile(
		from.replace('src', 'dist').replace('.yaml', '.json'),
		JSON.stringify(doc, null, 2)
	)
}

module.exports.commands = {
	build: {
		desc: 'Build Stratokit',
		args: {watch: {type: 'flag'}},
		run: async (exec, {watch}, utils) => {
			await fs.emptyDir('dist')
			// transpile src/ to dist/
			await exec(
				`babel ${
					watch ? '--watch' : ''
				} -s true --ignore '**/*.test.js' -D -d dist/ src/`
			)
			// yaml convert
			const yamlFiles = await utils.expandGlobsAsync(['src/**/*.yaml'])
			await fs.mkdirp('dist/config/defaults')
			await Promise.all(yamlFiles.map(x => doYaml(x)))
		},
	},

	buildGit: {
		desc: 'Build Stratokit and push to git branch',
		run: async exec => {
			await fs.emptyDir('dist')
			// transpile src/ to dist/
			await exec(`sh build-git.sh`)
		},
	},

	test: {
		args: {watch: {type: 'flag'}},
		run: (exec, {watch}) => exec(`ava --color ${watch ? '--watch' : ''} `),
	},
}
