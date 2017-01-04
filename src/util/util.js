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

export const babelPlugins = (options, extend = {}) => Object.assign({
  babelrc: false,
  presets: [
    require.resolve('babel-preset-react'),
    // ether false or undefined
    [require.resolve('babel-preset-es2015'), { modules: Boolean(options.test) && undefined }],
    require.resolve('babel-preset-es2016'),
    require.resolve('babel-preset-es2017'),
  ],
  plugins: [
    [require.resolve('babel-root-slash-import'), { rootPathSuffix: options.src }],
    require.resolve('babel-plugin-transform-runtime'),
    require.resolve('babel-plugin-transform-decorators-legacy'),
    require.resolve('babel-plugin-transform-class-properties'),
    require.resolve('babel-plugin-transform-function-bind'),
    require.resolve('babel-plugin-transform-object-rest-spread'),
    (options.react && options.watch && !options.node) && require.resolve('react-hot-loader/babel'),
  ].filter(Boolean),
}, extend);
