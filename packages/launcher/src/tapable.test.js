import {Hook, AsyncHook, addHook, addAsyncHook} from './tapable'

describe('Hook', () => {
	test('create', () => {
		expect(() => new Hook()).not.toThrow()
		expect(() => new Hook(['hi'], 'hello')).not.toThrow()
		expect(new Hook(['hi', 'there'], 'hello').name).toBe(`hello(hi, there)`)
	})

	test('tap', () => {
		const hook = new Hook(['meep'], 'hi')
		const fn = jest.fn()
		hook.tap('test', fn)
		expect(fn).not.toHaveBeenCalled()
	})

	test('tap(Async) before/after', () => {
		const hook = new Hook([], 'hi')
		hook.tap('test1', () => {})
		hook.tap('test2', () => {})
		hook.tap('test3', () => {}, {before: 'test2'})
		expect(hook.taps[1].name).toBe('test3')
		hook.tapAsync('test4', () => {}, {after: 'test3'})
		expect(hook.taps[2].name).toBe('test4')
		hook.tap('test5', () => {}, {after: 'unknown'})
		expect(hook.taps[hook.taps.length - 1].name).toBe('test5')
	})

	test('call', () => {
		const hook = new Hook(['meep'], 'hi')
		let i = 0
		const fn1 = jest.fn(() => expect(i++).toBe(0))
		const fn2 = jest.fn(() => expect(i++).toBe(1))
		hook.tap('test', fn1)
		hook.tap('test2', fn2)
		hook.call(12)
		expect(fn1).toHaveBeenCalledWith(12)
		expect(fn2).toHaveBeenCalledWith(12)
	})

	test('call rethrows', () => {
		const hook = new Hook(['meep'], 'hi')
		let i = 0
		const fn1 = jest.fn(() => {
			throw new Error('foo')
		})
		const fn2 = jest.fn(() => expect(i++).toBe(1))
		hook.tap('test', fn1)
		hook.tap('test2', fn2)
		expect(() => hook.call(12)).toThrow(/test.*foo/)
		expect(fn2).not.toHaveBeenCalled()
	})

	test('map', () => {
		const hook = new Hook(['meep'], 'hi')
		hook.tap('hi', n => n + 3)
		hook.tap('hi2', n => n + 4)
		expect(hook.map(10)).toEqual([13, 14])
	})
})

describe('AsyncHook', () => {
	test('create', () => {
		expect(() => new AsyncHook()).not.toThrow()
		expect(() => new AsyncHook(['hi'], 'hello')).not.toThrow()
		expect(new AsyncHook(['hi', 'there'], 'hello').name).toBe(
			`async hello(hi, there)`
		)
	})

	test('tap', () => {
		const hook = new AsyncHook(['meep'], 'hi')
		const fn = jest.fn()
		hook.tap('test', fn)
		expect(fn).not.toHaveBeenCalled()
	})

	test('tapAsync', () => {
		const hook = new AsyncHook(['meep'], 'hi')
		const fn = jest.fn()
		hook.tapAsync('test', fn)
		expect(fn).not.toHaveBeenCalled()
	})

	test('tapAsync makes Hook async', () => {
		const hook = new Hook(['meep'], 'hi')
		const fn = jest.fn()
		expect(hook).toHaveProperty('_async', false)
		hook.tapAsync('test', fn)
		expect(hook).toHaveProperty('_async', true)
	})

	test('call throws for sync/async mismatch', () => {
		const hook = new AsyncHook(['meep'], 'hi')
		const fn = jest.fn()
		hook.tapAsync('test', fn)
		expect(() => hook.call(5)).toThrow('async')
	})

	test('callAsync', async () => {
		const hook = new Hook(['meep'], 'hi')
		let i = 0
		const fn1 = jest.fn(() => expect(i++).toBe(0))
		const fn2 = jest.fn(() => expect(i++).toBe(1))
		hook.tapAsync('test', fn1)
		hook.tapAsync('test2', fn2)
		await hook.callAsync(12)
		expect(fn1).toHaveBeenCalledWith(12)
		expect(fn2).toHaveBeenCalledWith(12)
	})

	test('callAsync rethrows', async () => {
		const hook = new Hook(['meep'], 'hi')
		let i = 0
		const fn1 = jest.fn(() => Promise.reject(new Error('foo')))
		const fn2 = jest.fn(() => expect(i++).toBe(1))
		hook.tapAsync('bar', fn1)
		hook.tapAsync('test2', fn2)
		await expect(hook.callAsync(12)).rejects.toThrow(/bar.*foo/)
		expect(fn2).not.toHaveBeenCalled()
	})

	test('mapAsync', async () => {
		const hook = new Hook(['meep'], 'hi')
		hook.tap('hi', n => n + 3)
		hook.tapAsync('hi2', async n => n + 4)
		expect(await hook.mapAsync(10)).toEqual([13, 14])
		hook.tapAsync('hi3', async n => Promise.reject(new Error(n)))
		await expect(hook.mapAsync(10)).rejects.toThrow(/hi3.*10/)
	})

	test('addHook', async () => {
		const hooks = {}
		addHook(hooks, 'hi', ['hello'])
		expect(hooks).toHaveProperty('hi')
		expect(hooks.hi).toHaveProperty('isAsync', false)
	})

	test('addAsyncHook', async () => {
		const hooks = {}
		addAsyncHook(hooks, 'hi', ['hello'])
		expect(hooks).toHaveProperty('hi')
		expect(hooks.hi).toHaveProperty('isAsync', true)
	})

	test('add(Async)Hook throws on duplicate', async () => {
		const hooks = {}
		addHook(hooks, 'hi', ['hello'])
		expect(() => addHook(hooks, 'hi', ['hello'])).toThrow()
		expect(() => addAsyncHook(hooks, 'hi', ['hello'])).toThrow()
	})
})
