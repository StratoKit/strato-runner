# lazy-eval-recursive-config

Allow declarative configurations from independent sources with
embedded evaluation.

Example:

Given the configuration objects

```js
;[
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

This only uses `Object.defineProperty` so should work on everything.
