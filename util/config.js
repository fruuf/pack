const path = require('path');
const webpack = require('webpack');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');
const autoprefixer = require('autoprefixer');
const CaseSensitivePathsPlugin = require('case-sensitive-paths-webpack-plugin');
const findCacheDir = require('find-cache-dir');


const ensureExists = (fn) => {
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

const resolve = (loader, queryParts) => {
  // eslint-disable-next-line no-param-reassign
  if (!queryParts) queryParts = [];
  const loaderPath = require.resolve(loader);
  const query = queryParts
    .filter(Boolean)
    .join('&');
  return `${loaderPath}${query ? `?${query}` : ''}`;
};


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
  const modules = options.modules;
  const template = options.template;
  const lite = options.lite;
  const hostname = (process.env.C9_HOSTNAME && `http://${process.env.C9_HOSTNAME}`) || `http://localhost:${port}/`;
  const saveRootPath = encodeURIComponent(path.join(root, src));

  const nodeModules = {};
  if (node) {
    [
      ensureExists(path.join(__dirname, '../../node_modules')),
      ensureExists(path.join(root, 'node_modules')),
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
  const templateOptions = ensureExists(path.join(root, src, template))
    ? {
      template: path.join(root, src, template),
      inject: true,
    }
    : {};

  const createStyleLoaders = (test, watchMode, modulesMode, compile) => {
    // eslint-disable-next-line no-var
    var compiler = false;
    if (compile === 'sass') compiler = resolve('sass-loader', [`root=${saveRootPath}`]);
    if (compile === 'less') compiler = resolve('less-loader', [`root=${saveRootPath}`]);
    const result = { test };
    const innerStack = [
      resolve('css-loader', [
        modulesMode && 'modules',
        (modulesMode && watchMode) && 'localIdentName=[name]__[local]___[hash:base64:5]',
        '-autoprefixer',
        `root=${saveRootPath}`,
        'importLoaders=1',
      ]),
      resolve('postcss-loader'),
      compiler,
    ].filter(Boolean);
    if (watchMode) {
      result.loaders = [resolve('style-loader')].concat(innerStack);
    } else {
      result.loader = ExtractTextPlugin.extract(innerStack);
    }
    return result;
  };

  return {
    entry: [
      (node && watch) && resolve('webpack/hot/poll', ['1000']),
      (!node && watch) && resolve('react-hot-loader/patch'),
      (!node && watch) && resolve('webpack-dev-server/client', [hostname]),
      (!node && watch) && resolve('webpack/hot/dev-server'),
      !node && resolve('whatwg-fetch'),
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
    externals: node ? nodeModules : (options.externals || {}),
    context: root,
    resolve: {
      extensions: ['', '.js', '.json', '.coffee'],
      fallback: [
        react && ensureExists(path.join(root, src, components)),
        ensureExists(path.join(__dirname, '../node_modules')),
        ensureExists(path.join(__dirname, '../../node_modules')),
      ].filter(Boolean).concat(nodePaths),
      alias: [
        { main: path.join(root, src, main) },
        (!watch && !node && lite) && {
          react: require.resolve('react-lite'),
          'react-dom': require.resolve('react-lite'),
        },
      ]
      .filter(Boolean)
      .reduce((map, current) => Object.assign(map, current), {}),
    },
    watch: !!watch,
    module: {
      loaders: [
        {
          test: /\.js($|\?)/,
          loader: resolve('babel-loader'),
          exclude: /node_modules/,
          query: {
            babelrc: false,
            cacheDirectory: watch && findCacheDir({ name: 'pack' }),
            presets: [
              resolve('babel-preset-react'),
              resolve('babel-preset-es2015'),
              resolve('babel-preset-es2016'),
              resolve('babel-preset-es2017'),
            ],
            plugins: [
              resolve('babel-plugin-transform-runtime'),
              (react && watch && !node) && resolve('react-hot-loader/babel'),
              [resolve('babel-root-slash-import'), { rootPathSuffix: src }],
            ].filter(Boolean),
          },
        },
        {
          test: /\.json($|\?)/,
          loader: resolve('json-loader'),
        },
        {
          test: /\.coffee($|\?)/,
          loader: resolve('coffee-loader'),
        },
        !node && createStyleLoaders(/\.css($|\?(?!global))/, watch, modules, 'css'),
        !node && createStyleLoaders(/\.css\?global$/, watch, false, 'css'),
        !node && createStyleLoaders(/\.scss($|\?(?!global))/, watch, modules, 'sass'),
        !node && createStyleLoaders(/\.scss\?global$/, watch, false, 'sass'),
        !node && createStyleLoaders(/\.less($|\?(?!global))/, watch, modules, 'less'),
        !node && createStyleLoaders(/\.less\?global$/, watch, false, 'less'),
        !node && {
          test: /\.(png|jpg|jpeg|gif|svg)($|\?)/,
          loaders: [
            resolve('url-loader', [
              'limit=5000',
              'name=images/[name].[hash:base64:6].[ext]',
              `root=${saveRootPath}`,
            ]),
            !watch && resolve('image-webpack-loader', ['optimizationLevel=7', 'interlaced=false']),
          ].filter(Boolean),
        },
        !node && {
          test: /\.(webp)($|\?)/,
          loaders: [resolve('url-loader', ['limit=5000', 'name=images/[name].[hash:base64:6].[ext]'])],
        },
        !node && {
          test: /\.(html)($|\?)/,
          loader: resolve('raw-loader'),
        },
        {
          test: /\.(pug|jade)($|\?)/,
          loader: resolve('pug-loader', [`root=${saveRootPath}`, `basedir=${saveRootPath}`]),
        },
        !node && {
          test: /\.(woff|ttf|eot|woff2|otf)($|\?)/,
          loaders: [resolve('url-loader', ['limit=5000', 'name=fonts/[name].[hash:base64:6].[ext]'])],
        },
        !node && {
          test: /\.(ico|mp4|webm)($|\?)/,
          loaders: [resolve('url-loader', ['limit=5000', 'name=media/[name].[hash:base64:6].[ext]'])],
        },
        node && {
          test: /\.(css|scss|less|woff|ttf|eot|woff2|svg|ico|otf|webp|png|jpg|jpeg|gif|html|mp4|webm)($|\?)/,
          loader: resolve('raw-loader'),
        },
      ].filter(Boolean),
    },
    resolveLoader: {
      fallback: [
        react && ensureExists(path.join(root, src, components)),
        ensureExists(path.join(__dirname, '../node_modules')),
        ensureExists(path.join(__dirname, '../../node_modules')),
      ].filter(Boolean),
    },
    devtool: (watch && 'eval') || 'source-map',
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
      (!node && (watch || templateOptions.template) && !proxy) && new HtmlWebpackPlugin(templateOptions),
      watch && new CaseSensitivePathsPlugin(),
    ].filter(Boolean),
    node: {
      __dirname: false,
      __filename: false,
    },
    cache: true,
    debug: !!watch,
    bail: !watch,
    postcss: !node && (() => ([
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
