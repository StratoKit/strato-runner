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
		load: ({config}) => {
			config.state.loadCount++
		},
		start: async ({config}) => {
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
