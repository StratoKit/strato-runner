const yaml = require('js-yaml')
const fs = require('fs-extra')
const path = require('path')

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
			// yaml convert
			const yamlFiles = await utils.getFileChangesAsync('yaml', 'src/**/*.yaml')
			await fs.mkdirp('dist/config/defaults')
			await Promise.all(yamlFiles.added.concat(yamlFiles.modified).map(doYaml))

			// transpile src/ to dist/
			await exec(`babel ${watch ? '--watch' : ''} --source-map=true -d dist/ src/`)
		},
	},

	test: {
		args: {watch: {type: 'flag'}},
		run: (exec, {watch}) =>
			exec(`ava dist/**/*.test.js ${watch ? '--watch' : ''} `),
	},
}
