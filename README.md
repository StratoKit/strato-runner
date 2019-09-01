# StratoKit: Highly modular NodeJS project framework

# TODO

After consideration:

Plugins should not be registered in a `plugins.js` file. Maybe that can be optional. By registering them directly in the app, bundles only include the ones that are really needed. OTOH, how would you register project-only plugins like webpack and eslint? Using the require expansion in config?

Stratokit provides these services:

- declarative project configuration, for npm, plugins, app, transpilation
  - loading the config/\* from disk is only for when running under node; the browser config goes via defines, initial state or global vars
- plugin management (TODO add helpers for hooks, see how webpack does it)
- transpilation
- CLI tool to manage project meta files (package.json, eslint, ...) (TODO)

A run plugin would configure npm script lines to run a given file as a plugin `start()`, or a plugin.

A webpack plugin would get an entry file or plugin, and do all that is needed to build it with webpack, including maybe creating stubs (probably not needed). It should also handle hot reload. Babel-loader gets the transpilation config. For the client build, the transpile target is browser, and no script is run.

for example, you would run `stratokit hot-node src/_server` to run a react server (you'd need to at least start the `react-ssr` and `express` plugins). If you first ran `stratokit hot-browser src/_browser` (using e.g. `i18n`, `react`, `redux`, `apollo` plugins) it would detect the build socket and proxy that, otherwise serve the static assets.

To run webpack middleware, best to run it on a unix socket and proxy, although that's a bit sucky regarding terminal sessions. Maybe run it in background on demand with a watchdog to kill it if no app port visible for a while. It could also monitor webpack config and reload.

So it might be useful to call from the app init script `stratokit.start(plugin1, plugin2, "alreadyregisteredplugin3", require.resolve('fooplugin'))` and it would auto-register everything given.

It is probably also useful to dynamically register plugins, depending on the app config. If we wait until the load phase, the config needs re-finalizing, which is wasteful, so instead a `getDeps()` getter could be supported?

Also, the transpilation part should be a separate package, because it is not needed in production and it has heavy dependencies.

# _the below content does not yet fully reflect the above_

## Intro

StratoKit is a runner engine and a collection of plugins.

StratoKit enables:

- Using the latest Javascript features in the browser and on the server (using BabelJS)
- Hot Module Reloading, both in the browser and on the server, for a great dev experience (using Webpack)
- Optimized production builds for browser and server
- Plugins, both from packages and from the project
- Declarative, DevOps-friendly configuration

Stratokit's goals are:

- **No boilerplate**
- **No technology religion**
- Simple setup
- Easy reuse of plugins across projects
- Easy upgrades to plugins and Stratokit without project changes

This should result in projects that are developed faster with higher quality and are easy to maintain.

### No boilerplate

There are many "starter kits" and "generators" out there, which enable you to get started on a project quickly, but they generally create a project directory for you to start with and from then on you have to integrate any upgrades to the framework manually.

By using plugins and declaratively configuring them, all "framework-y" parts of the project can be upgraded separately, without changing the project source files. That way, you can be assured of the best performance and security available.

All a project needs to start is a `stratoconf.js` file which imports the project plugins, and a `config/` folder with the configuration (in JSON, YAML or JS format).

### No technology religion

The Javascript ecosystem is well known for its proliferation of frameworks and libraries. What is a great library choice now can be old hat tomorrow.

By giving plugins the ability to depend on and configure other plugins via names instead of `require()`, it is possible to replace even very basic dependencies like React and Express.

By having a declarative configuration and managing the build in StratoKit, Webpack and BabelJS are mere implementation details of hot-reloading and optimized application bundles. In fact, Webpack is just another plugin, only used when needed.

## Current state

WIP, we have a plugin system and are making plugins for building React+Redux+GraphQL+Styled Components+Express+event-sourcing-db SSR projects.

## StratoLaunch stages

### Configuration

The configuration of the project is loaded as follows:

- init config: prepare the `config` object with defaults and register basic plugins
- user config: load the `/config` folder, courtesy of `electrode-confippet`
- transpiling: `require()` transpilation is set up (according to `config`)
- plugins: load the `/config/plugins` file, this returns registered plugins
  - this must be done with `require` or `import` statements so WebPack can track the dependencies for the production NodeJS build
  - Maybe we make have a webpack yaml loader that allows specifying requires
  - Each level of this return value can be:
    - an array of plugins to add
    - an object with `name: plugin` mappings (useful for renames)
      - in this case you can also return a promise
    - a falsy value, which is ignored. Useful for `!__CLIENT__ && import('express')`
  - a plugin is an object with `name<String>` (required) and optional `requires<[String]>`, `config<Object>`, `load<async Fn>`, `start<async Fn>`, `stop<async Fn>`. Anything else is an error.
- Plugins can specify plugins they depend on, by name, in the `requires` array

### Load

When you start a plugin, it is first loaded along with all its dependencies. Steps:

- configure: recursively:
  - for this plugin + all plugins in `requires`, merge their `config` with the global `config`
- resolve all template interpolations in `config` - from now on all data in `config` is resolved
- load: recursively:
  - load the plugins named in `deps`, in order (so depth-first loading)
  - await `plugin.load(stratokit)` function if there is one
  - the load function sets up shared objects in the `stratokit` object, including maybe changing the `config`
  - TODO dynamically marking plugins as deps: extra deps will be loaded and added to deps

### Start

When starting a plugin, it is first loaded as above. This means:

- load config (as described above)
- start: same as load, but with the start function
  - start and load are separated so dependent plugins can hook into whatever mechanism the dependee plugin provides

### Running scripts

To run a normal script from the project, its full path is put in `config.entries{}` (like webpack config) and `config.run[]` (the names of the entries). Then, either the `run` or `webpack` plugin is started.

The `run` plugin simply `require()`s everything in `config.run[]` (via their `config.entries[name]` in the same process (could be made configurable). The script is transpiled in memory and can access the `stratokit` object by requiring it.

The `webpack` plugin compiles all the `config.entries` into separate bundles in the same directory, and runs the ones that are in `config.run`, each in their own process. If HMR is enabled, it watches the files and hot-reloads modules. This enables rapid development of e.g. API endpoints or GraphQL resolvers.

The difference between the `webpack` and `run` plugins is that the `run` plugin does not have the loader infrastructure that Webpack has, so you cannot run e.g. React SSR. On the plus side, it starts faster.

These will be done via `makfy` probably.

### Building scripts

This is for the `webpack` plugin only. It compiles the `config.entries` but doesn't get anything in `config.run` or `config.webpack.watch` so just exits after compiling.

This will be done via `makfy` probably.

## Plugins

- Plugins can be anything that resolves to a plugin object in the configuration. They can be NPM modules that import more plugins, files in your project, and even a simple object in your `config/plugins`
- To communicate between plugins, the can use any mechanism.
  - There should maybe be `hooks` and `events` descriptions, or at least something that you can read with a makfy command to know what to hook into, or maybe just a Readme.md.
- Plugins request NPM dependencies for the project, depending on configuration. This means that you don't need to manage eslint dependencies yourself, and you don't need to install dependencies you won't be using.
- You can also wrap a plugin, simply load it yourself and return augmented plugin object

## Thoughts to be integrated

- This also means that all config files should be immutably loaded so they can always be merged
- The difference between server and browser builds is simply that on server the config files are marked external and are read at runtime. The browser has a copy in the bundle
- The application entry point is a plugin
- To run, `stratokit run (pluginfile.js|pluginname)`
- To build a bundle, the webpack entry point is a loader that loads stratokit and then starts the named plugin

### Config

- config should be self-documenting
- Instead of reading files, they should be require()d so that updates are incorporated in hot reloads
- config is merged and lazy evaluated. This ensures correct config values are used at evaluation time.
- we're dropping confippet
- every plugin's config module returns object with config keys
- they're all pushed onto a `configs` stack with location info (e.g. plugin name, filename); this clears the value cache
  - in dev mode, the types are extracted from the ops into a separate propTypes object
  - types that override
- environment variables are added to config by an environment plugin that gets loaded before starting an app by the run/webpack plugins
- to check existance of a value, call `stratokit.config.has(path)`
- to get a value, call `stratokit.config.get(path)`
- this will recursively and synchronously merge from the configs stack
  - scalars, functions, Dates and arrays are final values
  - objects with a single key that starts with a `$opname` define an operation
    - this calls `stratokit.configOps[opname].op` and replaces the object with the return value (this can recurse)
    - to have a single key that starts with `$` you have to write `$$` and it will be escaped
    - all other objects are left unchanged and simply merged
  - for custom merging, use ops, e.g. `{$append: [1, 2]}` would result in `[...prevValue, 1, 2]`
  - `get` resulting in the wrong type throws
  - `get` on an undefined path throws
  - `get('')` gets the entire configuration
- the operations are pluggable by defining them under `stratokit.configOps`:
  - `[opName]: {description, op, inType, type, ignorePrev}`
  - `description`: required string, describes the op
  - `op({value, prevValue, config, path, location})`: required function, called to get the value replacing the object
    - ops functions are treated as pure and idempotent - they should not change any value they're given
    - `prevValue` is the result of `get` on the previous config object. Use this for merging.
    - `config` is the stratokit config object
    - `path` is the current config path
    - `location` is the config object location, for debugging etc
  - `inType`: optional propType function (from `prop-types` module) to verify value type
  - `type`: optional propType function to verify final result
  - `typeFn({value})`: optional factory for `type`
  - `ignorePrev`: bool, don't provide the previous value, for optimization
- ops examples
  - `` {$op: {op:({config}) => `bar ${config.get('hi')}`} `` (can be used in .js config files for in-place custom ops)
  - `{${}: "bar {{hi}}"}`
  - `{$insertBefore: {match: o => o.tag === 'SSR', value: {tag: 'graphql', init: initFn}}}`
  - plugins can define defaults with e.g. `foo: {$def: {type: propTypes.bool, description: 'do foo', default: true}}`
    - the op is: `def: {description: 'define a default value', op: ({value, path})=>{storeDesc(path, value.description);return value.default}, ignorePrev: true, typeFn: ({value})=>value.type}`
      - and then `storeDesc` stores the description somewhere for querying the configuration via the plugin that defines `def`
- config values are immutable
  - for mutable configuration objects, plugins should provide accessor functions, e.g. `const hooks = config.get('express.getHooks')()` (but probably hooks can be configured statically?)

## Once more, with feeling

- keep plugins idea, BUT

  - plugins self-register with stratokit, and can `require()` other plugins they have strict dependencies on, but they still need to add them to `requires` by name
  - non-strict deps are still by name
  - to register, call `stratokit.register({name, config, requires, load, start, stop, unload})` (extra props throw)
  - app entry points are simply scripts requiring plugins and then self-registering and starting
  - to do dynamic dependencies, import and load plugins during load phase (don't forget to stop/unload)
  - phases:
    - sync registering (by the app and the plugins)
    - sync configure: resolve `requires(config)` functions or arrays
      - if `requires` is a function, it gets the current `config`. It can register more plugins.
    - async load({config, states, load, start}) (manually or by start)
      - Throw if there is a config problem (use proptypes if you like)
      - prepare things
      - this can actually register and load or even start more plugins, as long as there are no cycles
        - use the given functions so you share the config
      - return a value which will be your entry instance in `states`
      - stratokit.load(name, extraConfigs[]) calls these functions and returns a promise for `{config, states, start, unload}`
    - async start({config, state, states, start})
      - stratokit.start(name, extraConfigs[]) calls these functions and returns a promise for `{config, states, stop, unload}` after start completion
    - async stop({config, state, states, stop})
      - the returned stop calls these functions and returns a promise for `{config, states, start, unload}` after stop completion
    - async unload({config, state, states, stop, unload})
      - the returned unload calls these functions and returns a promise for unload completion

- [x] keep config stack idea, BUT

  - plugin configs are frozen and stored in an array
  - a value can be anything and is lazy-gotten via a recursive proxy
  - no ops
  - if the value is a function, it is called with the config, a getter for the value "below" it, the plugin instance and a recursion limit
    - the return value is proxy-recursed as well
    - to have a function as a value, make a function that returns the function
      - to store state, use the plugin instance, since the function can be recreated at any time
  - user config comes via env, added by runner and webpack and always last
  - loading plugins will extend the config, retaining the env at the end
  - other approaches
    - like babel configuration, where you return an array of plugins with configurations, but they don't have access to the main configuration? and they don't have access to other plugins?
    - or calling config functions with the previous object, but then you can't read values from subsequent configs
  - API
    - makeConfig([configs]): returns LazyConfigStack instance: a recursive Proxy

- [x] export tapable interface

## Ideas

- documentation: call some function to get some documentation of the config. Maybe simply an object with the same keys as the config, and leaves are functions that return description+type+validate.
  - Add type registry with default validation functions?
  - `stratokit config [path]` shows the config under path with descriptions, types, and current values
  - errors could show from which config a value comes (can't pass through access functions though)
    - resolve path the `config` that introduced it and find the plugin that has that `config` in the registry
- if a plugin is not registered, try `require()` it? If it is then not in registry, throw.
  - bonus points: `require` within the module scope of the calling file. Dark module magic.
  - con: webpack won't like a `require()` without limitations
    - better wait for webpack integration and figure it out then.
- stratokit-cli package
  - run: webpack build entry and start-server-webpack-plugin
  - generate-files: boilerplate babelrc, eslintrc, prettierrc etc
- allow plugging into the stratokit launcher stages to augment the launcher?
