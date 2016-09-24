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

const resolve = (loader, queryParts) => {
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
  const env = options.env;
  const lint = options.lint;
  const modules = options.modules;
  const template = options.template;
  const hostname = (process.env.C9_HOSTNAME && `http://${process.env.C9_HOSTNAME}`) || `http://localhost:${port}/`;
  const saveRootPath = encodeURIComponent(path.join(root, src));

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

  const templateOptions = ensureExists(path.join(root, src, template))
    ? {
      template: path.join(root, src, template),
      inject: true,
    }
    : {};

  return {
    entry: [
      (node && watch) && resolve('webpack/hot/poll', ['1000']),
      (!node && watch) && resolve('react-hot-loader/patch'),
      (!node && watch) && resolve('webpack-dev-server/client', [hostname]),
      (!node && watch) && resolve('webpack/hot/dev-server'),
      (node && env) && path.join(__dirname, 'load-env'),
      !node && path.join(__dirname, 'polyfills'),
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
      extensions: ['', '.js', '.json', '.coffee'],
      fallback: [
        react && ensureExists(path.join(root, src, components)),
        ensureExists(path.join(__dirname, '../node_modules')),
      ].filter(Boolean).concat(nodePaths),
      alias: [
        { main: path.join(root, src, main) },
        (!watch && !node) && {
          react: require.resolve('react-lite'),
          'react-dom': require.resolve('react-lite'),
        },
      ]
      .filter(Boolean)
      .reduce((map, current) => Object.assign(map, current), {}),
    },
    watch: !!watch,
    module: {
      preLoaders: [
        lint && {
          test: /\.js($|\?)/,
          loader: resolve('eslint-loader'),
          include: path.join(root, src),
        },
        !node && {
          test: /\.scss($|\?)/,
          loader: resolve('sass-loader', [`root=${saveRootPath}`]),
        },
        !node && {
          test: /\.less($|\?)/,
          loader: resolve('less-loader', [`root=${saveRootPath}`]),
        },
      ].filter(Boolean),
      loaders: [
        {
          test: /\.js($|\?)/,
          loader: resolve('babel-loader'),
          exclude: /node_modules/,
          query: {
            babelrc: false,
            cacheDirectory: watch && findCacheDir({ name: 'pack' }),
            presets: [resolve('babel-preset-airbnb')],
            plugins: [
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
        (!node && watch) && {
          test: /\.(scss|less|css)($|\?(?!global))/,
          loaders: [
            resolve('style-loader'),
            resolve('css-loader', [
              modules && 'modules',
              modules && 'localIdentName=[name]__[local]___[hash:base64:5]',
              `root=${saveRootPath}`,
              'importLoaders=1',
              '-autoprefixer',
            ]),
            resolve('postcss-loader'),
          ],
        },
        (!node && !watch) && {
          test: /\.(scss|less|css)($|\?(?!global))/,
          loader: ExtractTextPlugin.extract(resolve('style-loader'), [
            resolve('css-loader', [
              '-autoprefixer',
              `root=${saveRootPath}`,
              'importLoaders=1',
              modules && 'modules',
            ]),
            resolve('postcss-loader'),
          ]),
        },
        // allow global modules
        (!node && !watch) && {
          test: /\.(scss|less|css)\?global$/,
          loader: ExtractTextPlugin.extract(resolve('style-loader'), [
            resolve('css-loader', [
              '-autoprefixer',
              `root=${saveRootPath}`,
              'importLoaders=1',
            ]),
            resolve('postcss-loader'),
          ]),
        },
        (!node && watch) && {
          test: /\.(scss|less|css)\?global$/,
          loaders: [
            resolve('style-loader'),
            resolve('css-loader', [
              `root=${saveRootPath}`,
              'importLoaders=1',
              '-autoprefixer',
            ]),
            resolve('postcss-loader'),
          ],
        },

        (!node && watch) && {
          test: /\.(png|jpg|jpeg|gif|svg)($|\?)/,
          loaders: [
            resolve('url-loader', [
              'limit=25000',
              'name=images/[name].[hash:base64:6].[ext]',
              `root=${saveRootPath}`,
            ]),
          ],
        },
        (!node && !watch) && {
          test: /\.(png|jpg|jpeg|gif|svg)($|\?)/,
          loaders: [
            resolve('url-loader', [
              'limit=25000',
              'name=images/[name].[hash:base64:6].[ext]',
              `root=${saveRootPath}`,
            ]),
            resolve('image-webpack-loader', ['optimizationLevel=7', 'interlaced=false']),
          ],
        },
        !node && {
          test: /\.(webp)($|\?)/,
          loaders: [resolve('url-loader', ['limit=25000', 'name=images/[name].[hash:base64:6].[ext]'])],
        },
        !node && {
          test: /\.(html)($|\?)/,
          loader: resolve('raw-loader'),
        },
        {
          test: /\.(pug|jade)($|\?)/,
          loader: resolve('pug-loader', [`root=${saveRootPath}`]),
        },
        !node && {
          test: /\.(woff|ttf|eot|woff2|otf)($|\?)/,
          loaders: [resolve('url-loader', ['limit=25000', 'name=fonts/[name].[hash:base64:6].[ext]'])],
        },
        !node && {
          test: /\.(ico|mp4|webm)($|\?)/,
          loaders: [resolve('url-loader', ['limit=25000', 'name=media/[name].[hash:base64:6].[ext]'])],
        },
        node && {
          test: /\.(css|scss|less|woff|ttf|eot|woff2|svg|ico|otf|webp|png|jpg|jpeg|gif|html|mp4|webm)($|\?)/,
          loader: resolve('raw-loader'),
        },
      ].filter(Boolean),
    },
    devtool: watch && (node && 'eval' || 'eval') || 'source-map',
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
    eslint: lint && {
      configFile: resolve('eslint-config-airbnb'),
      useEslintrc: false,
    },
  };
};
