import path from 'path';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import fs from 'fs';
import autoprefixer from 'autoprefixer';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import findCacheDir from 'find-cache-dir';
import { ensureExists, nodePaths, resolve, babelPlugins } from './util';

export default (options) => {
  const hostname = (process.env.C9_HOSTNAME && `http://${process.env.C9_HOSTNAME}`) || `http://localhost:${options.port}/`;
  const saveRootPath = encodeURIComponent(path.join(options.root, options.src));
  const additionalExtensions = ((options.resolve || '').match(/[\w\d]+/g) || []).map(ext => `.${ext}`);

  const jsPrefix = options.flatten ? '' : 'js/';
  const cssPrefix = options.flatten ? '' : 'css/';
  const imagesPrefix = options.flatten ? '' : 'images/';
  const fontsPrefix = options.flatten ? '' : 'fonts/';
  const mediaPrefix = options.flatten ? '' : 'media/';

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
  const templateOptions = ensureExists(path.join(options.root, options.src, options.index))
    ? {
      template: path.join(options.root, options.src, options.index),
      inject: true,
    }
    : {};


  const createStyleLoaders = (test, modulesMode, compile) => {
    // eslint-disable-next-line no-var
    var compiler = false;
    if (compile === 'sass') compiler = resolve('sass-loader', [`root=${saveRootPath}`]);
    if (compile === 'less') compiler = resolve('less-loader', [`root=${saveRootPath}`]);
    const result = { test };
    const innerStack = [
      resolve('css-loader', [
        modulesMode && 'modules',
        (modulesMode && (options.watch || options.watchwrite)) && 'localIdentName=[name]__[local]___[hash:base64:5]',
        '-autoprefixer',
        `root=${saveRootPath}`,
        'importLoaders=1',
      ]),
      resolve('postcss-loader'),
      compiler,
    ].filter(Boolean);
    if (options.watch || options.watchwrite) {
      result.loaders = [resolve('style-loader')].concat(innerStack);
    } else {
      result.loader = ExtractTextPlugin.extract(innerStack);
    }
    return result;
  };

  return {
    entry: [
      (options.node && options.watch) && resolve('webpack/hot/poll', ['1000']),
      (!options.node && options.watch && !options.watchwrite) && resolve('react-hot-loader/patch'),
      (!options.node && options.watch && !options.watchwrite) && resolve('webpack-dev-server/client', [hostname]),
      (!options.node && options.watch && !options.watchwrite) && resolve('webpack/hot/dev-server'),
      !options.node && resolve('whatwg-fetch'),
      (options.node || !options.react) && path.join(options.root, options.src, options.main),
      (!options.node && options.react) && path.join(__dirname, 'react'),
    ].filter(Boolean),
    output: {
      path: path.join(options.root, options.dist),
      publicPath: options.assets,
      filename: `${options.node ? '' : jsPrefix}${options.bundle}.js`,
      pathinfo: Boolean(options.watch || options.watchwrite),
    },
    target: options.node ? 'node' : 'web',
    externals: options.node ? nodeModules : (options.externals || {}),
    context: options.root,
    resolve: {
      extensions: ['', '.js', '.jsx', '.json', '.coffee', '.elm'].concat(additionalExtensions),
      fallback: [
        options.react && ensureExists(path.join(options.root, options.src, 'components')),
        ensureExists(path.join(__dirname, '../node_modules')),
        ensureExists(path.join(__dirname, '../../node_modules')),
      ].filter(Boolean).concat(nodePaths),
      alias: [
        { main: path.join(options.root, options.src, options.main) },
        (!options.watch && !options.node && options.lite) && {
          react: resolve('react-lite'),
          'react-dom': resolve('react-lite'),
        },
      ]
      .filter(Boolean)
      .reduce((map, current) => Object.assign(map, current), {}),
    },
    watch: Boolean(options.watch || options.watchwrite),
    module: {
      loaders: [
        {
          test: /\.jsx?($|\?)/,
          loader: resolve('babel-loader'),
          exclude: /node_modules/,
          query: babelPlugins(options, {
            cacheDirectory: (options.watch || options.watchwrite) && findCacheDir({ name: 'pack' }),
          }),
        },
        {
          test: /\.json($|\?)/,
          loader: resolve('json-loader'),
        },
        {
          test: /\.yaml($|\?)/,
          loaders: [
            resolve('json-loader'),
            resolve('yaml-loader'),
          ],
        },
        {
          test: /\.coffee($|\?)/,
          loader: resolve('coffee-loader'),
        },
        {
          test: /\.elm$/,
          exclude: [/elm-stuff/, /node_modules/],
          loaders: [
            resolve('elm-hot-loader'),
            resolve('elm-webpack-loader', [
              'warn=true',
              `cwd=${path.join(options.root)}`,
            ]),
          ],
        },
        !options.node && {
          test: /\.(graphql|gql)($|\?)/,
          exclude: /node_modules/,
          loader: resolve('graphql-tag/loader'),
        },
        !options.node && createStyleLoaders(/\.css($|\?(?!global))/, options.cssmodules, 'css'),
        !options.node && createStyleLoaders(/\.css\?global$/, false, 'css'),
        !options.node && createStyleLoaders(/\.scss($|\?(?!global))/, options.cssmodules, 'sass'),
        !options.node && createStyleLoaders(/\.scss\?global$/, false, 'sass'),
        !options.node && createStyleLoaders(/\.less($|\?(?!global))/, options.cssmodules, 'less'),
        !options.node && createStyleLoaders(/\.less\?global$/, false, 'less'),
        !options.node && {
          test: /\.(png|jpg|jpeg|gif|svg)($|\?)/,
          loaders: [
            resolve('url-loader', [
              'limit=5000',
              `name=${imagesPrefix}[name].[hash:base64:6].[ext]`,
              `root=${saveRootPath}`,
            ]),
            !(options.watch || options.watchwrite) && resolve('image-webpack-loader', ['optimizationLevel=7', 'interlaced=false']),
          ].filter(Boolean),
        },
        !options.node && {
          test: /\.(webp)($|\?)/,
          loader: resolve('url-loader', ['limit=5000', `name=${imagesPrefix}[name].[hash:base64:6].[ext]`]),
        },
        !options.node && {
          test: /\.(html)($|\?)/,
          loader: resolve('raw-loader'),
        },
        {
          test: /\.(pug|jade)($|\?)/,
          loader: resolve('pug-loader', [`root=${saveRootPath}`, `basedir=${saveRootPath}`]),
        },
        !options.node && {
          test: /\.(woff|ttf|eot|woff2|otf)($|\?)/,
          loader: resolve('url-loader', ['limit=5000', `name=${fontsPrefix}[name].[hash:base64:6].[ext]`]),
        },
        !options.node && {
          test: /\.(ico|mp4|webm)($|\?)/,
          loader: resolve('url-loader', ['limit=5000', `name=${mediaPrefix}[name].[hash:base64:6].[ext]`]),
        },
        options.node && {
          // eslint-disable-next-line max-len
          test: /\.(css|scss|less|woff|ttf|eot|woff2|svg|ico|otf|webp|png|jpg|jpeg|gif|html|mp4|webm)($|\?)/,
          loader: resolve('raw-loader'),
        },
      ].filter(Boolean),
    },
    resolveLoader: {
      fallback: [
        ensureExists(path.join(__dirname, '../node_modules')),
        ensureExists(path.join(__dirname, '../../node_modules')),
      ].filter(Boolean),
    },
    devtool: ((options.watch || options.watchwrite) && 'eval') || 'source-map',
    plugins: [
      new webpack.NoErrorsPlugin(),
      options.watch && !options.watchwrite && new webpack.HotModuleReplacementPlugin(),
      (options.watch || options.watchwrite) && new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('development'),
      }),
      !(options.watch || options.watchwrite) && new webpack.optimize.OccurenceOrderPlugin(),
      !(options.watch || options.watchwrite) && new webpack.optimize.DedupePlugin(),
      (
        !options.node &&
        !(options.watch || options.watchwrite)
      ) && new webpack.optimize.UglifyJsPlugin({
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
      (!options.node && !(options.watch || options.watchwrite)) && new ExtractTextPlugin(`${cssPrefix}${options.bundle}.css`),
      !(options.watch || options.watchwrite) && new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      (
        !options.node &&
        ((options.watch || options.watchwrite) || templateOptions.template) &&
        !options.proxy
      ) && new HtmlWebpackPlugin(templateOptions),
      (options.watch || options.watchwrite) && new CaseSensitivePathsPlugin(),
    ].filter(Boolean),
    node: {
      __dirname: false,
      __filename: false,
    },
    cache: true,
    debug: Boolean(options.watch || options.watchwrite),
    bail: !(options.watch || options.watchwrite),
    postcss: !options.node && (() => ([
      autoprefixer({
        browsers: [
          '>1%',
          'last 4 versions',
          'Firefox ESR',
          'not ie < 9', // React doesn't support IE8 anyway
        ],
      }),
    ])),
  };
};
