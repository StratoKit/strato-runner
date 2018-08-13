import path from 'path'

export default {
	name: 'run',
	version: '0.0.1',
	start: ({config}) => {
		for (const name of config.run) {
			const toRun = config.entries[name]
			if (toRun) {
				if (Array.isArray(toRun)) {
					toRun.forEach(f => require(path.resolve(config.paths.root, f)))
				} else {
					require(toRun)
				}
			} else {
				require(name)
			}
		}
	},
}
