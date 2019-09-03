import {Hook, AsyncHook} from './tapable'

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

	test('call throws', () => {
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
})
