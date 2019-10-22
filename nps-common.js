const {concurrent, rimraf, getBin} = require('nps-utils')

const runBabel = `NODE_ENV=production babel --root-mode upward -s true --ignore '**/*.test.js,**/__snapshots__' -d dist/`

let jestBin
try {
	jestBin = getBin('jest-cli', 'jest')
} catch (err) {
	jestBin = 'pleaseInstallJest'
}

const scripts = {
	build: {
		default: `nps build.clean build.babel`,
		clean: rimraf('dist/'),
		babel: `${runBabel} src/`,
		watch: `${runBabel} --watch src/`,
	},
	test: {
		default: concurrent.nps('test.lint', 'test.full'),
		lint: "eslint 'src/**/*.js'",
		lintFix: `
			eslint --fix 'src/**/*.js';
			prettier --write 'src/**/*.{js,jsx,json,md}'`,
		full: 'NODE_ENV=test jest --coverage --color',
		watch: 'NODE_ENV=test jest --color --watch',
		inspect: `NODE_ENV=test node --inspect ${jestBin} --runInBand --watch`,
	},
}

module.exports = {scripts}
