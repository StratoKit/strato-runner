const {concurrent, series, rimraf, copy, getBin} = require('nps-utils')
const scripts = require('../../nps-common')

const sshUser = 'cap'
const sshHost = 'cap.be'

process.env._dbg =
	'*,-babel*,-express*,-send,-body-parser*,-morgan,-compression,-puppeteer*,-slate*'

const ssh = `ssh -A ${sshUser}@${sshHost}`
const PROD = `NODE_ENV=\${NODE_ENV:-production}`
const DEV = `NODE_ENV=\${NODE_ENV:-development}`
const DEBUG = `DEBUG=\${DEBUG:-$_dbg}`
const CHROME = `CHROME_ONLY=\${CHROME_ONLY:-true}`

const webpack = (cfg, {prod, watch, browser, minify, modules} = {}) =>
	[
		`NODE_ENV=${prod ? 'production' : 'development'}`,
		browser && 'BROWSER=y',
		minify && 'MINIFY=y',
		modules && 'ESMODULES=y',
		`webpack --config ./lib/webpack/webpack.config.${cfg}.babel.js`,
		(watch && '--watch') || '--bail',
	]
		.filter(Boolean)
		.join(' ')

const makeStaProd = confFn => ({
	staging: confFn({
		envName: 'staging',
		dir: 'www-staging',
		service: `${sshUser}-staging`,
		user: sshUser,
		host: sshHost,
	}),
	production: confFn({
		envName: 'production',
		dir: 'www',
		service: sshUser,
		user: sshUser,
		host: sshHost,
	}),
})

let jestBin
try {
	jestBin = getBin('jest-cli', 'jest')
} catch (err) {
	jestBin = 'pleaseInstallJest'
}

Object.assign(scripts, {
	dev: {
		description: 'Run in development mode',
		default: `${CHROME} nps dev.debug`,
		plain: `${CHROME} nps build.dll dev.runPlain`,
		debug: `${CHROME} nps build.dll dev.runDebug`,
		inspect: `${CHROME} nps build.dll dev.runInspect`,
		runPlain: webpack('server', {watch: true}),
		runDebug: `${DEBUG} ${webpack('server', {watch: true})}`,
		runInspect: `${DEBUG} DEBUG_SERVER=y ${webpack('server', {watch: true})}`,
	},
	prod: {
		// use full path so it can be found with pgrep
		default: `${PROD} node $PWD/scripts/server.js`,
		inspect: `${DEBUG} ${PROD} node --inspect $PWD/scripts/server.js`,
	},
	dash: {
		default: 'NODEJS_DASH=true nodejs-dashboard -- nps prod',
		dev: 'NODEJS_DASH=true nodejs-dashboard -- nps dev',
	},
	build: {
		default: series.nps('build.server', 'build.client', 'build.client.old'),
		min: series.nps('build.server', 'build.client.min', 'build.client.oldMin'),
		client: {
			default: webpack('prod', {
				browser: true,
				modules: true,
				prod: true,
			}),
			old: webpack('prod', {
				browser: true,
				prod: true,
			}),
			dev: webpack('dev', {
				browser: true,
				modules: true,
				prod: false,
			}),
			min: webpack('prod', {
				browser: true,
				minify: true,
				modules: true,
				prod: true,
			}),
			oldMin: webpack('prod', {
				browser: true,
				minify: true,
				prod: true,
			}),
		},
		server: {
			default: webpack('server.prod', {prod: true}),
			min: `${webpack('server.prod', {
				minify: true,
				prod: true,
			})} --profile`,
		},
		dll: {
			// Disable for now
			default: 'true',
			ifNeeded: `if [ ! -r config/client-dev.dlls.json -o node_modules -nt config/client-dev.dlls.json ]; then CHROME_ONLY=false nps build.dll.all; fi`,
			all: 'nps build.dll.list build.dll.lib',
			list: series(
				`NODE_CONFIG='{"stratokit":{"webpack":{"useDlls":false}}}' nps build.client.dev`,
				`node ./scripts/webpack-stats-to-dll-list.js ./build/client-dev/_webpack_stats.json > config/client-dev.dlls.json`
			),
			lib: webpack('dll', {browser: true}),
		},
		clearCache: rimraf('build/cache node_modules/.cache'),
	},
	test: {
		default: concurrent.nps('test.lint', 'test.full'),
		lint: {
			default: "eslint '{src,lib,plugins}/**/*.js{,x}'",
			fix: series(
				`eslint --fix '{src,lib,plugins}/**/*.js{,x}'`,
				`prettier --write '{src,lib,plugins}/**/*.{js,jsx,json,md}'`
			),
		},
		full: 'NODE_ENV=test jest --coverage --color',
		watch: 'NODE_ENV=test jest --color --watch',
		inspect: `NODE_ENV=test node --inspect ${jestBin} --runInBand --watch`,
	},
	analyze: {
		default: concurrent.nps('analyze.modules', 'analyze.old'),
		modules:
			'webpack-bundle-analyzer build/client-esmodules/_webpack_stats.json -m static -r build/client-esmodules/_webpack_stats.html',
		old:
			'webpack-bundle-analyzer build/client/_webpack_stats.json -m static -r build/client/_webpack_stats.html',
		dev: series(
			'curl -o build/_webpack_stats-dev.json http://localhost:3000/_/_webpack_stats.json',
			'webpack-bundle-analyzer build/_webpack_stats-dev.json -m static -r build/_webpack_stats-dev.html'
		),
	},
	db: {
		prodToDev: {
			description: `Copies the local production DB files to development`,
			default: series(
				rimraf('data/development'),
				copy('data/production/* data/development/')
			),
		},
		devToProd: {
			description: `Copies the local development DB files to production`,
			default: series(
				rimraf('data/production'),
				copy('data/development/* data/production/')
			),
		},
		vacuum: {
			prod: `for i in data/production/*.sqlite3; do echo === $i; sqlite3 $i vacuum; done`,
			dev: `for i in data/development/*.sqlite3; do echo === $i; sqlite3 $i vacuum; done`,
		},
	},
	service: makeStaProd(({envName, dir, user, host, service}) => ({
		deploy: `nps service.${envName}.publish.check build.min service.${envName}.publish`,
		importFm: {
			default: `DEBUG=\${DEBUG:-*,-babel,-stratokit/DB:query} ${DEV} node scripts/doImport.js`,
			inspect: `${DEBUG} ${DEV} node --inspect scripts/doImport.js`,
		},
		publish: {
			default: `sh scripts/publish.sh ${user}@${host} ${dir} ${service}`,
			check: `sh scripts/publish.sh ${user}@${host} ${dir} ${service} check`,
		},
		push: {
			assets: `rsync -avzRP --include='**/_assets.json' --exclude='**/_*' build/client/ build/server/ ${user}@${host}:${dir}/`,
			db: series(
				`echo 'You will overwrite the production DB on the ≪${envName}≫ service from your data/production, are you sure? Press enter if so, Ctrl-C if not'`,
				'read i',
				`rsync -avzRP --delete-after data/production ${user}@${host}:${dir}/`,
				`nps service.${envName}.restart`,
				`echo "Please check and push again if needed - this operation is not 100% safe"`
			),
			uploads: `rsync -avzHRP build/upload ${user}@${host}:${dir}/`,
		},
		fetch: {
			uploads: `rsync -avzP ${user}@${host}:${dir}/build/upload build/`,
			db: series(
				`rsync -avzP --delete-after ${user}@${host}:'${dir}/data/production' data/`,
				"echo '=== Now run: `nps fetch.uploads` (if you want) and `nps db.prod-to-dev`'"
			),
		},
		restart: `${ssh} sudo /run/current-system/sw/bin/systemctl restart ${user}${
			envName === 'staging' ? '-staging' : ''
		}`,
		update: `${ssh} -t 'cd ${dir} && ./devshell.sh git pull && ./devshell.sh npx pnpm@3 i --only=prod'`,
		ssh: `${ssh} -t 'cd ${dir} && ./devshell.sh'`,
	})),
})

module.exports = {scripts}
