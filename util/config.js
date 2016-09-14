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

module.exports = ({ root, output, react, source, watch, port, components, assets, bundle, main }) => ({
  entry: {
    app: [
      (watch && react) && 'react-hot-loader/patch',
      watch && `webpack-dev-server/client?http://localhost:${port}/`,
      watch && 'webpack/hot/dev-server',
      !react && path.join(root, source, main),
      react && path.join(__dirname, 'react'),
    ].filter(filter => !!filter),
  },
  output: {
    path: path.join(root, output),
    publicPath: assets,
    filename: `${bundle}.js`,
  },
  context: root,
  resolve: {
    extensions: ['', '.js', '.json', '.scss', '.css'],
    fallback: [
      react && ensureExists(path.join(root, source, components)),
    ].filter(filter => !!filter),
    alias: {
      main: path.join(root, source, main),
    },
  },
  module: {
    loaders: [
      {
        test: /\.js$/,
        loader: 'babel',
        exclude: /node_modules/,
        query: {
          presets: ['airbnb'],
          plugins: [
            (react && watch) && 'react-hot-loader/babel',
            ['babel-root-slash-import', { rootPathSuffix: source }],
          ].filter(filter => !!filter),
        },
      },
      {
        test: /\.json$/,
        loader: 'json',
      },
      {
        test: /\.(woff|ttf|eot|woff2|svg)$/,
        loaders: ['url?limit=25000'],
      },
      watch && {
        test: /(\.scss|\.css)$/,
        loaders: ['style', 'css', 'sass'],
      },
      watch && {
        test: /\.(png|jpg|gif)$/,
        loaders: [
          'url?limit=25000',
        ],
      },
      !watch && {
        test: /(\.scss|\.css)$/,
        loader: ExtractTextPlugin.extract('style', 'css!sass'),
      },
      !watch && {
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
    !watch && new ExtractTextPlugin(`${bundle}.css`),
    !watch && new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify('production'),
    }),
    watch && new HtmlWebpackPlugin({}),
  ].filter(filter => !!filter),
});
