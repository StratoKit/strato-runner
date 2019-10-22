# lazy-recursive-merge

Allow declarative configurations from independent sources with
embedded evaluation.

This happens by taking an array of objects and merging them into a new object, and then providing getter functions to call functions with the new object. This allows creating e.g. a configuration where lower-priority configurations can access the higher-priority configuration values for calculations.

Using this concept, you can merge arrays, define file paths with prefixes, conditionally enable features etc.

Example:

Given the objects

```js
const configs = [
	{a: 'a'},
	{b: cfg => `${cfg.a}/${cfg.p}`},
	{p: 'hi'},
	{f: cfg => `m:${cfg.b}`, p: 'hello'},
]
```

the resulting configuration is

```js
{a: 'a', b: 'a/hello', p: 'hello', f: 'm:a/hello'}
```

In other words, the key `p` in the last object was used by the key `b` in the second object, and the key `f` in the last object used the key `b` in turn.

This way, you can define configurations that are loosely coupled but can change any part of the final configuration programmatically. This is a useful property for pluggable systems.

## How it works

Given an array of objects, they are merged as follows:

- higher-array-index objects get greater priority
- functions are called lazily as `fn(config, {prev, path})`
  - `prev` is the value at the same path of the previous objects
  - the result replaces the configuration value at that path
  - if the result is an object, it is handled recursively
    - you can return an object with functions for further evaluation
    - cycles are caught
- objects are merged
- anything else overrides lower priority values

## API

`lazyRecursiveMerge(objects, {target} = {})`

- `objects`: array of objects
- `target`: optional object that will get the configuration
- returns the configuration object

The return value is the mutated `target` object if it was passed. This way, you can retain
references to a changing configuration object.

## Requirements

This only uses `Object.defineProperty` and `WeakMap` (for loop detection only), so it should work on everything with a polyfill for `WeakMap`.

## Ideas for future work

- make a proper npm package build that will work for browsers
- a function to find which config determined the value of a given path, for error reporting.
- if `WeakMap` is not available, use a recursion depth limit
