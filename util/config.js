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
  const lint = options.lint;
  const modules = options.modules;

  const nodeModules = {};
  if (node) {
    [
      ensureExists(path.join(__dirname, '../node_modules')),
      ensureExists(path.join(root, 'node_modules')),
    ]
    .filter(Boolean)
    .concat(nodePaths)
    .forEach(nodeModulesPath => {
      fs.readdirSync(nodeModulesPath)
      .filter(x => ['.bin', '.cache'].indexOf(x) === -1)
      .forEach(mod => {
        nodeModules[mod] = `commonjs ${mod}`;
      });
    });
  }

  return {
    entry: [
      (node && watch) && `${require.resolve('webpack/hot/poll')}?1000`,
      (!node && watch) && require.resolve('react-hot-loader/patch'),
      (!node && watch) && `${require.resolve('webpack-dev-server/client')}?http://localhost:${port}/`,
      (!node && watch) && require.resolve('webpack/hot/dev-server'),
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
        ensureExists(path.join(__dirname, '../node_modules')),
      ].filter(Boolean).concat(nodePaths),
      alias: {
        main: path.join(root, src, main),
      },
    },
    watch: !!watch,
    module: {
      preLoaders: [
        lint && {
          test: /\.js$/,
          loader: require.resolve('eslint-loader'),
          include: path.join(root, src),
        },
      ].filter(Boolean),
      loaders: [
        {
          test: /\.js$/,
          loader: require.resolve('babel-loader'),
          exclude: /node_modules/,
          query: {
            babelrc: false,
            cacheDirectory: watch && findCacheDir({ name: 'pack' }),
            presets: [require.resolve('babel-preset-airbnb')],
            plugins: [
              (react && watch && !node) && require.resolve('react-hot-loader/babel'),
              [require.resolve('babel-root-slash-import'), { rootPathSuffix: src }],
            ].filter(Boolean),
          },
        },
        {
          test: /\.json$/,
          loader: require.resolve('json-loader'),
        },
        (!node && watch) && {
          test: /(\.scss|\.css)$/,
          loaders: [
            require.resolve('style-loader'),
            // eslint-disable-next-line max-len
            `${require.resolve('css-loader')}${modules ? '?modules&importLoaders=1&localIdentName=[name]__[local]___[hash:base64:5]' : ''}`,
            require.resolve('sass-loader')],
        },
        (!node && !watch) && {
          test: /(\.scss|\.css)$/,
          loader: ExtractTextPlugin.extract(require.resolve('style-loader'), [
            `${require.resolve('css-loader')}?-autoprefixer${modules ? '&modules' : ''}`,
            require.resolve('postcss-loader'),
            require.resolve('sass-loader'),
          ]),
        },
        (!node && watch) && {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          loaders: [
            `${require.resolve('url-loader')}?limit=25000&name=images/[name].[hash:base64:6].[ext]`,
          ],
        },
        (!node && !watch) && {
          test: /\.(png|jpg|jpeg|gif|svg)$/,
          loaders: [
            `${require.resolve('url-loader')}?limit=25000&name=images/[name].[hash:base64:6].[ext]`,
            `${require.resolve('image-webpack-loader')}?optimizationLevel=7&interlaced=false`,
          ],
        },
        !node && {
          test: /\.(webp)$/,
          loaders: [`${require.resolve('url-loader')}?limit=25000&name=images/[name].[hash:base64:6].[ext]`],
        },
        {
          test: /\.(html)$/,
          loader: require.resolve('raw-loader'),
        },
        {
          test: /\.(pug|jade)$/,
          loader: require.resolve('pug-loader'),
        },
        !node && {
          test: /\.(woff|ttf|eot|woff2|otf)$/,
          loaders: [`${require.resolve('url-loader')}?limit=25000&name=fonts/[name].[hash:base64:6].[ext]`],
        },
        !node && {
          test: /\.(ico|mp4|webm)$/,
          loaders: [`${require.resolve('url-loader')}?limit=25000&name=media/[name].[hash:base64:6].[ext]`],
        },
        node && {
          test: /\.(css|scss|woff|ttf|eot|woff2|svg|ico|otf|webp|png|jpg|jpeg|gif)$/,
          loader: require.resolve('raw-loader'),
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
    eslint: lint && {
      configFile: require.resolve('eslint-config-airbnb'),
      useEslintrc: false,
    },
  };
};
