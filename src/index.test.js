import test from 'ava'
import path from 'path'

process.chdir('test-project')

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
