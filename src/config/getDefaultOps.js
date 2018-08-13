import PropTypes from 'prop-types'
import path from 'path'
import Def from './Def'

const path = {
	description: 'Calls path.resolve(value)',
	op({value}) {
		return path.resolve(value)
	},
	inType: PropTypes.string.isRequired,
	type: PropTypes.string.isRequired,
}

let getDepth = 0
const get = {
	description: 'Gets a value from config recursively',
	op({path, location, value: configPath, config}) {
		if (getDepth++ > 50)
			throw new Error(`${location}: $get('${configPath}'): recursing too deep`)
		const value = config.get(configPath)
		getDepth--
		return value
	},
	inType: PropTypes.string.isRequired,
}

const getDefaultOps = () => ({
	path,
	get,
	def: new Def(),
})
