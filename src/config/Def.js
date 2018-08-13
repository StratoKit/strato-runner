// TODO printConfig or something like that

import PropTypes from 'prop-types'
import set from 'lodash/set'

const wrapError = (fn, location) => (...args) => {
	try {
		return fn(...args)
	} catch (err) {
		err.message = `${location}: ${err.message}`
		throw err
	}
}

class Def {
	definitions = {}

	description = 'Define a config value'

	_addDefinition(path, definition) {
		this.definitions[path] = definition
		return definition.value
	}

	_makeShapes = (obj, path = '') => {
		for (const [key, value] of Object.entries(obj)) {
			if (value && typeof value === 'object') {
				const shape = this._makeShapes(value, `${path}.${key}`)
				const alsoType = this.definitions[path]
				if (alsoType) {
					obj[key] = (...args) => {
						alsoType(...args)
						shape(...args)
					}
				} else {
					obj[key] = shape
				}
			}
		}
		return PropTypes.shape(obj)
	}

	_calcPropTypes() {
		const propTypes = {}
		for (const [path, {type, location}] of Object.entries(this.definitions)) {
			set(propTypes, path, wrapError(type, location))
		}
		return makeShapes(propTypes)
	}

	checkPropTypes(config) {
		if (process.env.NODE_ENV !== 'production') {
			const propTypes = this._calcPropTypes()
			PropTypes.checkPropTypes(propTypes, config, 'config', '')
		}
	}

	op({value: def, path, location}) {
		if (Array.isArray(value)) {
			const [description, type, value] = def
			return this._addDefinition(path, {description, type, value, location})
		}
		return this._addDefinition(path, {...def, location})
	}

	inType = PropTypes.oneOfType([
		PropTypes.array,
		PropTypes.shape({
			description: PropTypes.string,
			type: PropTypes.func,
			value: PropTypes.any,
		}),
	]).isRequired

	typeFn({value: definition}) {
		return definition.type
	}
}

export default Def
