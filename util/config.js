const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const autoprefixer = require('autoprefixer');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const findCacheDir = require('find-cache-dir');


const ensureExists = fn => {
  try {
    fs.statSync(fn);
    return fn;
  } catch (e) {
    return false;
  }
};

const nodeModules = {};
fs.readdirSync('node_modules')
  .filter((x) => ['.bin'].indexOf(x) === -1)
  .forEach((mod) => {
    nodeModules[mod] = `commonjs ${mod}`;
  });

const nodePaths = (process.env.NODE_PATH || '')
  .split(process.platform === 'win32' ? ';' : ':')
  .filter(Boolean)
  .map(p => path.resolve(p));

module.exports = (options) => {
  const root = options.root;
  const output = options.output;
  const react = options.react;
  const src = options.src;
  const watch = options.watch;
  const port = options.port;
  const components = options.components;
  const assets = options.assets;
  const bundle = options.bundle;
  const main = options.main;
  const node = options.node;
  const proxy = !!options.proxy;
  const env = options.env;
  return {
    entry: [
      (node && watch) && 'webpack/hot/poll?1000',
      (!node && watch && react) && 'react-hot-loader/patch',
      (!node && watch) && `webpack-dev-server/client?http://localhost:${port}/`,
      (!node && watch) && 'webpack/hot/dev-server',
      (node && env) && path.join(__dirname, 'load-env'),
      (!node && !watch) && path.join(__dirname, 'polyfills'),
      (node || !react) && path.join(root, src, main),
      (!node && react) && path.join(__dirname, 'react'),
    ].filter(Boolean),
    output: {
      path: path.join(root, output),
      publicPath: assets,
      chunkFilename: `${node ? '' : 'js/'}${bundle}.chunk[hash:base64:6].js`,
      filename: `${node ? '' : 'js/'}${bundle}.js`,
      pathinfo: !!watch,
    },
    target: node ? 'node' : 'web',
    externals: node ? nodeModules : {},
    context: root,
    resolve: {
      extensions: ['', '.js', '.json'],
      fallback: [
        react && ensureExists(path.join(root, src, components)),
      ].filter(Boolean).concat(nodePaths),
      alias: {
        main: path.join(root, src, main),
      },
    },
    watch: !!watch,
    module: {
      loaders: [
        {
          test: /\.js$/,
          loader: 'babel',
          exclude: /node_modules/,
          query: {
            babelrc: false,
            cacheDirectory: watch && findCacheDir({ name: 'pack' }),
            presets: ['airbnb'],
            plugins: [
              (react && watch && !node) && 'react-hot-loader/babel',
              ['babel-root-slash-import', { rootPathSuffix: src }],
            ].filter(Boolean),
          },
        },
        {
          test: /\.json$/,
          loader: 'json',
        },
        !node && {
          test: /\.(woff|ttf|eot|woff2|svg|ico|otf|webp)$/,
          loaders: ['url?limit=25000&name=media/[name].[hash:base64:6].[ext]'],
        },
        (!node && watch) && {
          test: /(\.scss|\.css)$/,
          loaders: ['style', 'css', 'sass'],
        },
        (!node && watch) && {
          test: /\.(png|jpg|jpeg|gif)$/,
          loaders: [
            'url?limit=25000&name=images/[name].[hash:base64:6].[ext]',
          ],
        },
        (!node && !watch) && {
          test: /(\.scss|\.css)$/,
          loader: ExtractTextPlugin.extract('style', ['css?-autoprefixer', 'postcss', 'sass']),
        },
        (!node && !watch) && {
          test: /\.(png|jpg|jpeg|gif)$/,
          loaders: [
            'url?limit=25000&name=images/[name].[hash:base64:6].[ext]',
            'image-webpack?optimizationLevel=7&interlaced=false',
          ],
        },
        node && {
          test: /\.(css|scss|woff|ttf|eot|woff2|svg|ico|otf|webp|png|jpg|jpeg|gif)$/,
          loader: 'raw',
        },
      ].filter(Boolean),
    },
    devtool: watch ? 'eval' : 'source-map',
    plugins: [
      new webpack.NoErrorsPlugin(),
      watch && new webpack.HotModuleReplacementPlugin(),
      watch && new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('development'),
      }),
      !watch && new webpack.optimize.OccurenceOrderPlugin(),
      !watch && new webpack.optimize.DedupePlugin(),
      (!node && !watch) && new webpack.optimize.UglifyJsPlugin({
        compress: {
          screw_ie8: true, // React doesn't support IE8
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
      (!node && !watch) && new ExtractTextPlugin(`css/${bundle}.css`),
      !watch && new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      (!node && watch && !proxy) && new HtmlWebpackPlugin({}),
      watch && new CaseSensitivePathsPlugin(),
    ].filter(Boolean),
    node: {
      __dirname: false,
      __filename: false,
    },
    cache: !!watch,
    debug: !!watch,
    bail: !watch,
    postcss: (!watch && !node) && (() => ([
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
