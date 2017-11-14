// In theory we should be testing without transpiling from ava
// But plugins.js transpiling works now and it's annoying to keep transpiling separate
// Once something ava-webpack comes out we can use that
import {join} from 'path'
import test from 'ava'

process.chdir(join(process.cwd(), 'tests/test-project'))

test('initial config', t => {
	const config = require('./config').default
	t.snapshot(config)
})

test('initial registry', t => {
	const registry = require('./registry').default
	t.snapshot(registry)
})

test('start', async t => {
	const {start, stop, plugins, config} = require('.').default
	await start('test')
	t.is(plugins.test.started, true)
	t.is(config.state.loadCount, 1)
	t.is(config.state.startCount, 1)
	t.is(config.state2.loadCount, 1)
	t.is(config.state2.startCount, 1)
	t.true(config.promise)
	await stop('test')
	await start('test')
	t.is(config.state2.loadCount, 1)
	t.is(config.state2.startCount, 2)
})
