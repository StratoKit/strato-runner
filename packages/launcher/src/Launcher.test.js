import {registerPlugin, load, start} from '.'

const test2 = {
	name: 'test2',
	config: {
		state2: 'foo',
	},
	load: () => {
		return {loaded: true}
	},
	start: ({state}) => {
		state.started = true
	},
}

registerPlugin({
	name: 'test',
	requires: cfg => {
		if (cfg.useTest2) {
			registerPlugin(test2)
			return ['test2']
		}
		return []
	},
	version: '1.0.0',
	config: {
		otherPath: cfg => `${cfg.somePath}/${cfg.state2 || 'bar'}`,
	},
	load: ({config, states}) => {
		if (!states) throw new Error('Did not get states arg')
		if (!states.test2.loaded) throw new Error('test2 not loaded')
		return {loaded: config.otherPath}
	},
	start: async ({config, state, states}) => {
		if (!state || !state.loaded) throw new Error('Did not get state arg')
		if (!states || !states.test2) throw new Error('Did not get states arg')
		if (!states.test2.started) throw new Error('test2 not started')
		state.started = true
	},
})

test('works', async () => {
	const launcher = await start('test', {useTest2: true, somePath: '/root'})
	expect(launcher.config).toHaveProperty('otherPath', '/root/foo')
	expect(launcher).toHaveProperty('states.test.started', true)
	expect(launcher).toHaveProperty('states.test2.started', true)
})
