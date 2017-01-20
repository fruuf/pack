import path from 'path';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import fs from 'fs';
import autoprefixer from 'autoprefixer';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import findCacheDir from 'find-cache-dir';
import jsonfile from 'jsonfile';
import loadEnvFile from 'node-env-file';
import { exec } from 'child_process';
import { ensureExists, nodePaths, babelPlugins } from './util';

// takes options as an argument (ether derived from CLI or pack.json) and returns webpack options
export default async (options) => {
  // run commands in the project root
  const command = cmd => new Promise((resolve) => {
    exec(cmd, { cwd: options.root }, (err, stdout, stderr) => {
      if (err || stderr) {
        resolve('');
      } else {
        resolve(stdout.split('\n').join(''));
      }
    });
  });

  // we want to allow cloud9 out of the box and support https
  const hostname = (process.env.C9_HOSTNAME && `http://${process.env.C9_HOSTNAME}`) || `http${options.secure ? 's' : ''}://localhost:${options.port}/`;
  const GIT_COMMIT_HASH = await command('git rev-parse HEAD');
  const GIT_BRANCH_NAME = await command('git rev-parse --abbrev-ref HEAD');
  const devMode = Boolean(options.watch || options.watchwrite);

  // passing extensions via CLI can be a bit weird, we normalise them here
  const additionalExtensions = ((options.resolve || '').match(/[\w\d]+/g) || []).map(ext => `.${ext}`);

  // we have quite a few options to alter how the output looks, we group them here
  const jsPrefix = options.flatten ? '' : 'js/';
  const cssPrefix = options.flatten ? '' : 'css/';
  const imagesPrefix = options.flatten ? '' : 'images/';
  const fontsPrefix = options.flatten ? '' : 'fonts/';
  const mediaPrefix = options.flatten ? '' : 'media/';

  // to inject keys etc into a client bundle webpack replaces process.env.[NAME] when provided
  let environment = {};
  if (options.env) {
    let envFile = '';
    if (path.isAbsolute(options.env)) {
      envFile = ensureExists(options.env);
    } else {
      envFile = [
        path.join(options.root, options.src, options.env),
        path.join(options.root, options.env),
      ].map(ensureExists).filter(Boolean)[0] || '';
    }

    if (!envFile) {
      throw new Error(`env file ${options.env} not found`);
    } else if (path.extname(envFile).toLowerCase() === '.json') {
      try {
        environment = jsonfile.readFileSync(envFile);
      } catch (e) {
        throw new Error(`invalid json in ${envFile}`);
      }
    } else {
      try {
        environment = loadEnvFile(envFile, { raise: true });
      } catch (e) {
        throw new Error(`bad format in ${envFile}`);
      }
    }
  }

  const mergeEnvironment = envBase => Object.assign(
    Object.keys(environment).reduce((acc, cur) => Object.assign(acc, {
      [`process.env.${cur}`]: JSON.stringify(environment[cur]),
    }), {
      'process.env.GIT_COMMIT_HASH': JSON.stringify(GIT_COMMIT_HASH),
      'process.env.GIT_BRANCH_NAME': JSON.stringify(GIT_BRANCH_NAME),
    }),
    envBase,
  );

  // we need all installed node modules to prevent webpack from including them into a server bundle
  const nodeModules = {};
  if (options.node) {
    [
      ensureExists(path.join(__dirname, '../../node_modules')),
      ensureExists(path.join(options.root, 'node_modules')),
    ]
    .filter(Boolean)
    .concat(nodePaths)
    .forEach((nodeModulesPath) => {
      fs.readdirSync(nodeModulesPath)
      .filter(x => ['.bin', '.cache'].indexOf(x) === -1)
      .forEach((mod) => {
        nodeModules[mod] = `commonjs ${mod}`;
      });
    });
  }

  // we use a webpack plugin to serve some basic html to include scripts and bootstrap react
  const templateOptions = ensureExists(path.join(options.root, options.src, 'index.html'))
    ? {
      template: path.join(options.root, options.src, 'index.html'),
      inject: true,
    }
    : {};


  const createStyleLoaders = (extension, parser = false) => {
    // creates the stack of loaders to parse less/sass/css and prefix it
    const getInnerLoaders = cssModules => ([
      {
        loader: 'css-loader',
        options: {
          modules: cssModules,
          localIdentName: '[name]__[local]___[hash:base64:5]',
          autoprefixer: false,
          root: path.join(options.root, options.src),
          importLoaders: 1,
        },
      },
      { loader: 'postcss-loader' },
      (parser) && {
        loader: `${parser}-loader`,
        options: {
          root: path.join(options.root, options.src),
        },
      },
    ].filter(Boolean));

    // wraps the inner stack for development (embedded) and productiobn (extract into css file)
    const wrapInnerLoaders = (test, cssModules) => {
      const result = { test };
      if (devMode) {
        result.use = [{ loader: 'style-loader' }].concat(getInnerLoaders(cssModules));
      } else {
        result.loader = ExtractTextPlugin.extract({
          fallbackLoader: 'style-loader',
          // ExtractTextPlugino only supports query, not options
          loader: getInnerLoaders(cssModules).map(
            loader => Object.assign({}, loader, { query: loader.options }),
          ),
        });
      }
      return result;
    };

    // allows bypassing css modules with .global.css
    if (options.cssmodules) {
      return { oneOf: [
        wrapInnerLoaders(new RegExp(`\\.global\\.${extension}$`, 'i'), false),
        wrapInnerLoaders(new RegExp(`\\.${extension}$`, 'i'), true),
      ] };
    }
    return wrapInnerLoaders(new RegExp(`\\.${extension}$`, 'i'), false);
  };

  // webpack 2 resolves modules relative to its root (context), so we need to convert them
  const ensureExistsRelative = (fn) => {
    const existingFn = ensureExists(fn);
    if (!existingFn) return '';
    const relativeFn = path.relative(options.root, existingFn);
    return relativeFn;
  };

  return {
    entry: [
      (options.node && options.watch) && 'webpack/hot/poll?1000',
      (!options.node && options.watch && !options.watchwrite) && 'react-hot-loader/patch',
      (!options.node && options.watch && !options.watchwrite) && `webpack-dev-server/client?${hostname}`,
      (!options.node && options.watch && !options.watchwrite) && 'webpack/hot/dev-server',
      !options.node && 'whatwg-fetch',
      (options.node || !options.react) && path.join(options.root, options.src, options.main),
      (!options.node && options.react) && path.join(__dirname, 'react'),
    ].filter(Boolean),
    output: {
      path: path.join(options.root, options.dist),
      publicPath: options.assets,
      filename: `${options.node ? '' : jsPrefix}${options.bundle}${(options.hash && !devMode) ? '.[hash]' : ''}.js`,
      pathinfo: devMode,
    },
    target: options.node ? 'node' : 'web',
    externals: options.node ? nodeModules : (options.externals || {}),
    context: options.root,
    resolveLoader: {
      modules: [
        // for development or global install we want to resolve pack-cli node_modules as well
        ensureExistsRelative(path.join(__dirname, '..', 'node_modules')),
        ensureExistsRelative(path.join(__dirname, '..', '..', 'node_modules')),
        'node_modules',
      ].filter(Boolean),
    },
    resolve: {
      extensions: ['.js', '.jsx', '.json', '.coffee'].concat(additionalExtensions),
      modules: [
        // allows to resolve react components as first class modules
        options.react && ensureExists(path.join(options.root, options.src, 'components')),
        ensureExistsRelative(path.join(__dirname, '..', 'node_modules')),
        ensureExistsRelative(path.join(__dirname, '..', '..', 'node_modules')),
        'node_modules',
      ].filter(Boolean).concat(
        // we resolve all global paths as well
        nodePaths.map(absolutePath => path.relative(options.root, absolutePath)),
      ),
      alias: [
        { main: path.join(options.root, options.src, options.main) },
        (!options.watch && !options.node && options.lite) && {
          react: 'react-lite',
          'react-dom': 'react-lite',
        },
      ]
      .filter(Boolean)
      .reduce((map, current) => Object.assign(map, current), {}),
    },
    watch: devMode,
    cache: true,
    bail: !devMode,
    performance: {
      hints: !devMode && 'warning',
    },
    module: {
      rules: [
        {
          test: /\.jsx?$/,
          use: [{
            loader: 'babel-loader',
            options: babelPlugins(options, {
              cacheDirectory: devMode && findCacheDir({ name: 'pack' }),
            }),
          }],
          exclude: /node_modules/,
        },
        {
          test: /\.yaml$/,
          use: ['json-loader', 'yaml-loader'],
        },
        {
          test: /\.coffee$/,
          use: ['coffee-loader'],
        },
        !options.node && {
          test: /\.(graphql|gql)$/,
          exclude: /node_modules/,
          use: ['graphql-tag/loader'],
        },
        !options.node && createStyleLoaders('css'),
        !options.node && createStyleLoaders('scss', 'sass'),
        !options.node && createStyleLoaders('less', 'less'),
        !options.node && {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 5000,
                name: `${imagesPrefix}[name].[hash:base64:6].[ext]`,
                root: path.join(options.root, options.src),
              },
            },
            !devMode && {
              loader: 'image-webpack-loader',
              options: {
                optimizationLevel: 7,
                interlaced: false,
              },
            },
          ].filter(Boolean),
        },
        !options.node && {
          test: /\.(webp)$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 5000,
              name: `${imagesPrefix}[name].[hash:base64:6].[ext]`,
            },
          }],
        },
        !options.node && {
          test: /\.html$/,
          use: ['raw-loader'],
        },
        {
          test: /\.(pug|jade)$/,
          use: [{
            loader: 'pug-loader',
            options: {
              root: path.join(options.root, options.src),
              basedir: path.join(options.root, options.src),
            },
          }],
        },
        !options.node && {
          test: /\.(woff|ttf|eot|woff2|otf)$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 5000,
              name: `${fontsPrefix}[name].[hash:base64:6].[ext]`,
            },
          }],
        },
        !options.node && {
          test: /\.(ico|mp4|webm)$/,
          use: [{
            loader: 'url-loader',
            options: {
              limit: 5000,
              name: `${mediaPrefix}[name].[hash:base64:6].[ext]`,
            },
          }],
        },
        options.node && {
          // eslint-disable-next-line max-len
          test: /\.(css|scss|less|woff|ttf|eot|woff2|svg|ico|otf|webp|png|jpg|jpeg|gif|html|mp4|webm)$/,
          use: ['raw-loader'],
        },
      ].filter(Boolean),
    },
    devtool: (devMode && 'eval-source-map') || 'source-map',
    plugins: [
      devMode && new webpack.HotModuleReplacementPlugin(),
      devMode && new webpack.NamedModulesPlugin(),
      new webpack.LoaderOptionsPlugin({
        minimize: !devMode,
        debug: devMode,
        options: {
          postcss: [
            autoprefixer({
              browsers: [
                '>1%',
                'last 4 versions',
                'Firefox ESR',
                'not ie < 9', // React doesn't support IE8 anyway
              ],
            }),
          ],
        },
      }),
      devMode && new webpack.DefinePlugin(mergeEnvironment({
        'process.env.NODE_ENV': JSON.stringify('development'),
      })),
      !devMode && new webpack.DefinePlugin(mergeEnvironment({
        'process.env.NODE_ENV': JSON.stringify('production'),
      })),
      (!devMode) && new webpack.optimize.UglifyJsPlugin({
        sourceMap: true,
        compress: {
          screw_ie8: true,
          warnings: false,
        },
        mangle: {
          screw_ie8: true,
        },
        output: {
          comments: false,
          screw_ie8: true,
        },
      }),
      (
        !options.node && !devMode
      ) && new ExtractTextPlugin(`${cssPrefix}${options.bundle}${(options.hash && !devMode) ? '.[hash]' : ''}.css`),
      (
        !options.node &&
        (devMode || templateOptions.template || options.quick) &&
        !options.proxy
      ) && new HtmlWebpackPlugin(templateOptions),
      devMode && new CaseSensitivePathsPlugin(),
    ].filter(Boolean),
    node: {
      __dirname: false,
      __filename: false,
    },
  };
};
