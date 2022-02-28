"use strict";

require("core-js/modules/es.promise.js");

require("core-js/modules/es.regexp.exec.js");

var _path = require("path");

// In theory we should be testing without transpiling from ava
// But plugins.js transpiling works now and it's annoying to keep transpiling separate
// Once something ava-webpack comes out we can use that
process.chdir((0, _path.join)(process.cwd(), 'tests/test-project'));
test('initial config', () => {
  const config = require('./config').default;

  expect(config).toMatchSnapshot();
});
test('initial registry', () => {
  const registry = require('./registry').default;

  expect(registry).toMatchSnapshot();
});
test('start', async () => {
  const {
    start,
    stop,
    plugins,
    config
  } = require('.').default;

  await start('test');
  expect(plugins.test.started).toBe(true);
  expect(config.state.loadCount).toBe(1);
  expect(config.state.startCount).toBe(1);
  expect(config.state2.loadCount).toBe(1);
  expect(config.state2.startCount).toBe(1);
  expect(config.promise).toBe(true);
  await stop('test');
  await start('test');
  expect(config.state2.loadCount).toBe(1);
  expect(config.state2.startCount).toBe(2);
});
//# sourceMappingURL=index.test.js.map