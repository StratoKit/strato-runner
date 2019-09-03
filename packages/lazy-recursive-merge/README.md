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

`makeConfig(configs, {target} = {})`

- `configs`: array of objects
- `target`: optional object that will get the configuration
- returns the configuration object

## Requirements

This only uses `Object.defineProperty` and `WeakMap`, so it should work on everything with a polyfill for `WeakMap`.

## TODO

- make a proper npm package build that will work for browsers
- a function to find which config determined the value of a given path, for error reporting.
