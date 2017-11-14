const fs = require('fs-extra')

module.exports.commands = {
	build: {
		desc: 'Build Stratokit',
		args: {watch: {type: 'flag'}},
		run: async (exec, {watch}) => {
			await fs.emptyDir('dist')
			// transpile src/ to dist/
			await exec(
				`babel ${watch
					? '--watch'
					: ''} -s true --ignore '**/*.test.js' -D -d dist/ src/`
			)
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
