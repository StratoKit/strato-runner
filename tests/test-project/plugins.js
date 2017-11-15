// uncomment this to test import failure detection - should fail
// require('farstarst')

const state = {
	loadCount: 0,
	startCount: 0,
}

module.exports = [
	{
		name: 'test',
		requires: ['test2'],
		version: '1.0.0',
		config: {
			state,
		},
		load: ({config, plugin, plugins}) => {
			if (!plugin || plugin.name !== 'test')
				throw new Error('Did not get plugin arg')
			if (!plugins || plugins.test2.name !== 'test2')
				throw new Error('Did not get plugins arg')
			config.state.loadCount++
		},
		start: async ({config, plugin, plugins}) => {
			if (!plugin || plugin.name !== 'test')
				throw new Error('Did not get plugin arg')
			if (!plugins || plugins.test2.name !== 'test2')
				throw new Error('Did not get plugins arg')
			config.state.startCount++
		},
	},
	[
		null,
		{
			name: 'test2',
			requires: ['promise'],
			config: {
				state2: state,
			},
			load: async ({config, plugin}) => {
				config.state2.loadCount++
				// Test adding deps during load
				// plugin.requires.push('name')
			},
			start: ({config}) => {
				config.state2.startCount++
			},
		},
	],
	false,
	{
		name: {
			name: 'name',
			config: {
				name: true,
			},
		},
		promise: Promise.resolve({
			name: 'promise',
			config: {
				promise: true,
			},
		}),
	},
]
