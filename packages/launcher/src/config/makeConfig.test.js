import makeConfig, {_getCore, _mergeKeys, _squash} from './makeConfig'

const configs = [
	{n: 1, a: true, c: NaN, d: {e: 3}},
	{n: 2, b: 'hi', d: {e: 3, f: 1}},
	{n: 3, a: false},
]

describe('utils', () => {
	test('_getCore', () => {
		expect(_getCore(['n'], configs)).toEqual([1, 2, 3])
		expect(_getCore(['a'], configs)).toEqual([true, false])
		expect(_getCore(['g'], configs)).toEqual([])
		expect(_getCore(['d', 'e'], configs)).toEqual([3, 3])
		expect(_getCore(['d', 'f'], configs)).toEqual([1])
	})

	test('_mergeKeys', () => {
		expect(
			_mergeKeys([
				{a: 1, b: undefined},
				{c: null, a: 3, d: 4},
				{a: () => {}, e: 1},
			])
		).toEqual(['a', 'b', 'c', 'd', 'e'])
	})

	const f = () => {}
	test.each([
		[[], []],
		[[null], [null]],
		[[undefined], [undefined]],
		[[undefined, 5], [undefined]],
		[[5, undefined, 3], [5]],
		[[{a: 1}], [{a: 1}]],
		[[{a: 1}, {a: 2, b: 3}], [{a: 1}, {a: 2, b: 3}]],
		[[{a: 1}, 5, {a: 2, b: 3}], [{a: 1}]],
		[[3, {a: 1}], [3]],
		[[null, {a: 1}], [null]],
		[[f, 5], [f, 5]],
		[[3, f], [3]],
		[[{a: 1}, f], [{a: 1}, f]],
		[[f, {a: 1}, {b: 1}, f], [f, {a: 1}, {b: 1}, f]],
	])('_squash %o', (core, result) => {
		expect(_squash(core)).toEqual(result)
	})
})

describe('makeConfig', () => {
	test('create', () => {
		let config
		expect(() => {
			config = makeConfig(configs)
		}).not.toThrow()
		expect(config).toEqual({n: 3, a: false, b: 'hi', c: NaN, d: {e: 3, f: 1}})
	})

	test('error', () => {
		const thrower = () => {
			throw new Error('foo')
		}
		let config
		expect(() => {
			config = makeConfig([{a: {meep: thrower}}])
		}).not.toThrow()
		expect(() => config.a.meep).toThrow(/a\.meep.*foo/)
	})

	test('cycle self', () => {
		const cycler = c => c.a.meep
		let config
		expect(() => {
			config = makeConfig([{a: {meep: cycler}}])
		}).not.toThrow()
		expect(() => config.a.meep).toThrow('cycle')
	})

	test('cycle loop', () => {
		let config
		expect(() => {
			config = makeConfig([{a: {b: c => c.a.c, c: c => c.a.b}}])
		}).not.toThrow()
		expect(() => config.a.b).toThrow('cycle')
	})

	test('update object', () => {
		const config = makeConfig(configs)
		expect(makeConfig([...configs, {q: 1}], {target: config})).toBe(config)
	})

	test('read-only result', () => {
		const config = makeConfig(configs)
		expect(() => {
			config.a = 5
		}).toThrow()
	})

	test.each([
		[[{a: 1, b: c => c.a}], {a: 1, b: 1}],
		[[{a: 1}, {b: c => c.a}], {a: 1, b: 1}],
		[[{a: 1}, {b: () => 5}, {b: (_, {prev}) => prev + 1}], {a: 1, b: 6}],
		[
			[{a: {d: true}}, {b: c => c.a}, {b: {e: false}}],
			{a: {d: true}, b: {d: true, e: false}},
		],
		[
			[{a: {d: true}}, {b: c => c.a}, {b: {e: false}}],
			{a: {d: true}, b: {d: true, e: false}},
		],
		[[{a: () => ({r: 1, b: () => 5})}], {a: {r: 1, b: 5}}],
		[
			[
				{a: 'a'},
				{b: c => `${c.a}/${c.p}`},
				{p: 'hi'},
				{f: c => `m:${c.b}`, p: 'hello'},
			],
			{a: 'a', b: 'a/hello', p: 'hello', f: 'm:a/hello'},
		],
		[
			[{a: () => ({b: 5, c: c => c.a.b + 1})}, {a: {d: 1}}],
			{a: {b: 5, c: 6, d: 1}},
		],
	])('case %#', (configs, result) => {
		expect(makeConfig(configs)).toEqual(result)
	})
})
