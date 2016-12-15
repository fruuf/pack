import fs from 'fs';
import path from 'path';

export const ensureExists = (fn) => {
  try {
    fs.statSync(fn);
    return fn;
  } catch (e) {
    return false;
  }
};

export const nodePaths = (process.env.NODE_PATH || '')
  .split(process.platform === 'win32' ? ';' : ':')
  .filter(Boolean)
  .map(p => path.resolve(p));

export const resolve = (loader, queryParts) => {
  // eslint-disable-next-line no-param-reassign
  if (!queryParts) queryParts = [];
  const loaderPath = require.resolve(loader);
  const query = queryParts
    .filter(Boolean)
    .join('&');
  return `${loaderPath}${query ? `?${query}` : ''}`;
};

export const babelPlugins = (options, extend = {}) => Object.assign({
  babelrc: false,
  presets: [
    resolve('babel-preset-react'),
    resolve('babel-preset-es2015'),
    resolve('babel-preset-es2016'),
    resolve('babel-preset-es2017'),
  ],
  plugins: [
    [resolve('babel-root-slash-import'), { rootPathSuffix: options.src }],
    resolve('babel-plugin-transform-runtime'),
    resolve('babel-plugin-transform-decorators-legacy'),
    resolve('babel-plugin-transform-class-properties'),
    resolve('babel-plugin-transform-function-bind'),
    resolve('babel-plugin-transform-object-rest-spread'),
    (options.react && options.watch && !options.node) && resolve('react-hot-loader/babel'),
  ].filter(Boolean),
}, extend);
