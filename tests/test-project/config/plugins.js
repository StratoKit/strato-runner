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
		load: ({config, plugin}) => {
			config.state.loadCount++
			plugin.requires.push('name')
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
			load: async ({config}) => {
				config.state2.loadCount++
			},
			start: ({config}) => {
				config.state2.startCount++
			},
		},
	],
	false,
	{
		name: {name: 'name', config: {name: true}},
		promise: Promise.resolve({name: 'promise', config: {promise: true}}),
	},
]
