const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');

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
  return {
    entry: [
      (node && watch) && 'webpack/hot/poll?1000',
      (!node && watch && react) && 'react-hot-loader/patch',
      (!node && watch) && `webpack-dev-server/client?http://localhost:${port}/`,
      (!node && watch) && 'webpack/hot/dev-server',
      (node || !react) && path.join(root, src, main),
      (!node && react) && path.join(__dirname, 'react'),
    ].filter(filter => !!filter),
    output: {
      path: path.join(root, output),
      publicPath: assets,
      filename: `${bundle}.js`,
    },
    target: node ? 'node' : 'web',
    externals: node ? nodeModules : {},
    context: root,
    resolve: {
      extensions: [''].concat([
        '.js',
        '.json',
        !node && '.scss',
        !node && '.css',
      ].filter(filter => !!filter)),
      fallback: [
        react && ensureExists(path.join(root, src, components)),
      ].filter(filter => !!filter),
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
            presets: ['airbnb'],
            plugins: [
              (react && watch && !node) && 'react-hot-loader/babel',
              ['babel-root-slash-import', { rootPathSuffix: src }],
            ].filter(filter => !!filter),
          },
        },
        {
          test: /\.json$/,
          loader: 'json',
        },
        !node && {
          test: /\.(woff|ttf|eot|woff2|svg)$/,
          loaders: ['url?limit=25000'],
        },
        (!node && watch) && {
          test: /(\.scss|\.css)$/,
          loaders: ['style', 'css', 'sass'],
        },
        (!node && watch) && {
          test: /\.(png|jpg|gif)$/,
          loaders: [
            'url?limit=25000',
          ],
        },
        (!node && !watch) && {
          test: /(\.scss|\.css)$/,
          loader: ExtractTextPlugin.extract('style', 'css!sass'),
        },
        (!node && !watch) && {
          test: /\.(png|jpg|gif)$/,
          loaders: [
            'url?limit=25000',
            'image-webpack?optimizationLevel=7&interlaced=false',
          ],
        },
      ].filter(filter => !!filter),
    },
    devtool: watch ? 'eval-source-map' : 'source-map',
    plugins: [
      new webpack.NoErrorsPlugin(),
      watch && new webpack.HotModuleReplacementPlugin(),
      watch && new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('development'),
      }),
      !watch && new webpack.optimize.OccurenceOrderPlugin(),
      !watch && new webpack.optimize.UglifyJsPlugin({
        compress: {
          warnings: false,
        },
      }),
      (!node && !watch) && new ExtractTextPlugin(`${bundle}.css`),
      !watch && new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify('production'),
      }),
      (!node && watch && !proxy) && new HtmlWebpackPlugin({}),
      node && new webpack.IgnorePlugin(/\.(css|scss)$/),
      node && new webpack.BannerPlugin('require("source-map-support").install();', { raw: true, entryOnly: false }),

    ].filter(filter => !!filter),
    node: {
      __dirname: false,
      __filename: false,
    },
  };
};
