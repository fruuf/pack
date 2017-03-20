import fs from 'fs';
import path from 'path';
import jsonfile from 'jsonfile';
import loadEnvFile from 'node-env-file';
import { exec } from 'child_process';

// returns the path if it exists, otherwise false to be filtered by Boolean
export const ensureExists = (fn) => {
  try {
    fs.statSync(fn);
    return fn;
  } catch (e) {
    return false;
  }
};

// exports an object with babelRC options
export const babelPlugins = (options, extend = {}) =>
  Object.assign(
    {
      // we dont allow modifications via .babelrc
      babelrc: false,
      ignore: /node_modules/,
      presets: [
        // transpile react
        require.resolve('babel-preset-react'),
        // ether false or undefined for modules, since mocha needs modules transpiled
        [require.resolve('babel-preset-es2015'), { modules: Boolean(options.test) && undefined }],
        require.resolve('babel-preset-es2016'),
        // async / await
        require.resolve('babel-preset-es2017'),
      ],
      plugins: [
        // allow importing wiht a root slash that resolves into the srx directory
        [require.resolve('babel-root-slash-import'), { rootPathSuffix: options.src }],
        // polyfills via imports
        require.resolve('babel-plugin-transform-runtime'),
        // they were popular and some projects still use decorators
        require.resolve('babel-plugin-transform-decorators-legacy'),
        // fancy class property definitions
        require.resolve('babel-plugin-transform-class-properties'),
        // binding functions to scopes with ::
        require.resolve('babel-plugin-transform-function-bind'),
        // ...rest for object desctruction
        require.resolve('babel-plugin-transform-object-rest-spread'),
        // required for react hot relaoding
        options.react &&
          options.watch &&
          !options.node &&
          !options.test &&
          require.resolve('react-hot-loader/babel'),
      ].filter(Boolean),
    },
    extend,
  );

// get an array of all global node_modules paths
export const nodePaths = (process.env.NODE_PATH || '')
  .split(process.platform === 'win32' ? ';' : ':')
  .filter(Boolean)
  .map(p => path.resolve(p));

// returns an object with all currently available node modules
export const getNodeModules = options =>
  [
    // global install
    ensureExists(path.join(__dirname, '../../node_modules')),
    // local install with old npm
    ensureExists(path.join(options.root, 'node_modules')),
  ]
    .filter(Boolean)
    // add global node paths
    .concat(nodePaths)
    .reduce(
      (nodeModules, nodeModulesPath) =>
        fs.readdirSync(nodeModulesPath).filter(x => ['.bin', '.cache'].indexOf(x) === -1).reduce(
          (pathNodeModules, module) =>
            Object.assign({}, pathNodeModules, {
              [module]: `commonjs ${module}`,
            }),
          nodeModules,
        ),
      {},
    );

// to inject keys etc into a client bundle webpack replaces process.env.[NAME] when provided
export const getEnvironment = async (options) => {
  // run commands in the project root
  const command = cmd =>
    new Promise((resolve) => {
      exec(cmd, { cwd: options.root }, (err, stdout, stderr) => {
        if (err || stderr) {
          resolve('');
        } else {
          resolve(stdout.split('\n').join(''));
        }
      });
    });

  // find git env variables via git command line
  const GIT_COMMIT_HASH = await command('git rev-parse HEAD');
  const GIT_BRANCH_NAME = await command('git rev-parse --abbrev-ref HEAD');
  const BUILD_TARGET = options.node ? 'node' : 'browser';

  // node environment gets inlined into the bundle
  const NODE_ENV = ((options.watch || options.watchwrite) && 'development') ||
    (options.test && 'test') ||
    'production';

  let userEnvironment = {};
  if (options.env) {
    let envFile = '';
    // finds the env file
    if (path.isAbsolute(options.env)) {
      envFile = ensureExists(options.env);
    } else {
      // search for relative env file in src and in root directory
      envFile = [
        path.join(options.root, options.src, options.env),
        path.join(options.root, options.env),
      ]
        .map(ensureExists)
        .filter(Boolean)[0] || '';
    }

    if (!envFile) {
      // throw error when option provided but the file couldnt be found
      throw new Error(`env file ${options.env} not found`);
    } else if (path.extname(envFile).toLowerCase() === '.json') {
      // attempt to load json
      try {
        userEnvironment = jsonfile.readFileSync(envFile);
      } catch (e) {
        throw new Error(`invalid json in ${envFile}`);
      }
    } else {
      // attempt to encode env file
      try {
        userEnvironment = loadEnvFile(envFile, { raise: true });
      } catch (e) {
        throw new Error(`bad format in ${envFile}`);
      }
    }
  }

  // merge defaults with provided environment variables
  return Object.assign(
    { GIT_BRANCH_NAME, GIT_COMMIT_HASH, NODE_ENV, BUILD_TARGET },
    userEnvironment,
  );
};

export const resolvePath = (options, filename, context) => {
  if (path.isAbsolute(filename)) {
    return path.join(options.root, options.src, filename);
  }
  return path.join(path.dirname(context), filename);
};
