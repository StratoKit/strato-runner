// From https://github.com/electrode-io/electrode-confippet/blob/master/lib/process-config.js
'use strict';

require("core-js/modules/es.array.iterator.js");

require("core-js/modules/es.regexp.exec.js");

require("core-js/modules/es.string.replace.js");

require("core-js/modules/es.string.trim.js");

const {
  each,
  isObjectLike,
  get,
  isFunction,
  isUndefined,
  isString,
  isEmpty,
  defaults
} = require('lodash');

const fs = require('fs');

function processObj(obj, data) {
  const depthPath = data.depth.join('.');
  const {
    config,
    context
  } = data;
  each(obj, (value, key) => {
    if (isObjectLike(value)) {
      data.depth.push(key);
      processObj(value, data);
      data.depth.pop();
      return;
    }

    const resolve = tmpl => {
      const [path, ...params] = tmpl.split(':');

      if (path.startsWith('-')) {
        // plain string
        return path.substr(1);
      }

      const x = get(context, path);
      if (isFunction(x)) return x({
        context,
        config,
        obj,
        key,
        value,
        tmpl,
        params,
        depthPath,
        resolve
      });

      if (isUndefined(x)) {
        data.missing.push({
          path: `${depthPath}.${key}`,
          value,
          tmpl
        });
        return '';
      }

      return params.length ? `${x}${params.map(x => resolve(x)).join('')}` : x;
    };

    if (isString(value)) {
      if (/^\{\{[^}]+}}$/.test(value)) {
        const newV = resolve(value.slice(2, -2));
        obj[key] = newV;

        if (typeof newV === 'string' && newV.includes('{{')) {
          data.more++;
        }
      } else if (value.includes('{{')) {
        obj[key] = value.replace(/\{\{([^}]+)}}/g, (match, tmpl) => {
          const newV = resolve(tmpl);

          if (typeof newV === 'string' && newV.includes('{{')) {
            data.more++;
          }

          return newV;
        });
      }
    }
  });
}

function processConfig(config, options) {
  if (isEmpty(config)) {
    return [];
  }

  options = options || {};
  const context = {
    config,
    process,
    argv: process.argv,
    cwd: process.cwd(),
    env: process.env,
    now: Date.now,
    readFile: ({
      params
    }) => {
      if (params[0]) {
        const enc = params[1] || 'utf8';
        return fs.readFileSync(params[0].trim()).toString(enc.trim());
      }

      throw new Error('config file readFile template missing filename');
    },
    getEnv: ({
      params
    }) => {
      if (params[0]) {
        let value = process.env[params[0]];

        if (value) {
          const cc = params[1];

          if (cc === 'lowerCase' || cc === 'LC') {
            value = value.toLowerCase();
          } else if (cc === 'upperCase' || cc === 'UC') {
            value = value.toUpperCase();
          }
        }

        return value;
      }
    }
  };
  defaults(context, options.context);
  const data = {
    config,
    context,
    options,
    more: 1,
    missing: [],
    depth: ['config']
  };
  const maxRun = 20;

  for (let i = 0; data.more > 0; i++) {
    if (i >= maxRun) {
      throw new Error(`Unable to process config after ${maxRun} passes.`);
    }

    data.more = 0;
    processObj(config, data);
  }

  return data.missing;
}

module.exports = processConfig;
//# sourceMappingURL=processConfig.js.map