# StratoKit: Highly modular NodeJS project framework

# TODO

After consideration:

Plugins should not be registered in a `plugins.js` file. Maybe that can be optional. By registering them directly in the app, bundles only include the ones that are really needed.

Stratokit provides these services:

  * declarative project configuration, for npm, plugins, app, transpilation
    * loading the config/* from disk is only for when running under node; the browser config goes via defines, initial state or global vars
  * plugin management (TODO add helpers for hooks, see how webpack does it)
  * transpilation

A run plugin would configure npm script lines to run a given file as a plugin, or a plugin.

A webpack plugin would get an entry file or plugin, and do all that is needed to build it with webpack, including maybe creating stubs (probably not needed). It should also handle hot reload. Babel-loader gets the transpilation config. For the client build, the transpile target is browser, and no script is run.

To run webpack middleware, best to run it on a unix socket and proxy, although that's a bit sucky regarding terminals. Maybe run it in background on demand with a watchdog to kill it if no app port visible for a while. It could also monitor webpack config and reload.

So it might be useful to call from the app init script `stratokit.start(plugin1, plugin2, "alreadyregisteredplugin3", require.resolve('fooplugin'))` and it would auto-register everything given.

It is probably also useful to dynamically register plugins, depending on the app config. If we wait until the load phase, the config needs re-finalizing, which is wasteful, so instead a `getDeps()` getter could be supported?

_the below does not yet fully reflect this_

## Intro

StratoKit is a runner engine and a collection of plugins.

StratoKit enables:

* Using the latest Javascript features in the browser and on the server (using BabelJS)
* Hot Module Reloading, both in the browser and on the server, for a great dev experience (using Webpack)
* Optimized production builds for browser and server
* Plugins, both from packages and from the project
* Declarative, DevOps-friendly configuration

Stratokit's goals are:

* **No boilerplate**
* **No technology religion**
* Simple setup
* Easy reuse of plugins across projects
* Easy upgrades to plugins and Stratokit without project changes

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

* init config: prepare the `config` object with defaults and register basic plugins
* user config: load the `/config` folder, courtesy of `electrode-confippet`
* transpiling: `require()` transpilation is set up (according to `config`)
* plugins: load the `/config/plugins` file, this returns registered plugins
  * this must be done with `require` or `import` statements so WebPack can track the dependencies for the production NodeJS build
  * Maybe we make have a webpack yaml loader that allows specifying requires
  * Each level of this return value can be:
    * an array of plugins to add
    * an object with `name: plugin` mappings (useful for renames)
      * in this case you can also return a promise
    * a falsy value, which is ignored. Useful for `!__CLIENT__ && import('express')`
  * a plugin is an object with `name<String>` (required) and optional `requires<[String]>`, `config<Object>`, `load<async Fn>`, `start<async Fn>`, `stop<async Fn>`. Anything else is an error.
* Plugins can specify plugins they depend on, by name, in the `requires` array

### Load

When you start a plugin, it is first loaded along with all its dependencies. Steps:

* configure: recursively:
  * for this plugin + all plugins in `requires`, merge their `config` with the global `config`
* resolve all template interpolations in `config` - from now on all data in `config` is resolved
* load: recursively:
  * load the plugins named in `deps`, in order (so depth-first loading)
  * await `plugin.load(stratokit)` function if there is one
  * the load function sets up shared objects in the `stratokit` object, including maybe changing the `config`
  * TODO dynamically marking plugins as deps: extra deps will be loaded and added to deps

### Start

When starting a plugin, it is first loaded as above. This means:

* load config (as described above)
* start: same as load, but with the start function
  * start and load are separated so dependent plugins can hook into whatever mechanism the dependee plugin provides

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

* Plugins can be anything that resolves to a plugin object in the configuration. They can be NPM modules that import more plugins, files in your project, and even a simple object in your `config/plugins`
* To communicate between plugins, the can use any mechanism.
  * There should maybe be `hooks` and `events` descriptions, or at least something that you can read with a makfy command to know what to hook into, or maybe just a Readme.md.
* Plugins request NPM dependencies for the project, depending on configuration. This means that you don't need to manage eslint dependencies yourself, and you don't need to install dependencies you won't be using.
* You can also wrap a plugin, simply load it yourself and return augmented plugin object
