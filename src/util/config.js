import path from 'path';
import webpack from 'webpack';
import ExtractTextPlugin from 'extract-text-webpack-plugin';
import HtmlWebpackPlugin from 'html-webpack-plugin';
import autoprefixer from 'autoprefixer';
import CaseSensitivePathsPlugin from 'case-sensitive-paths-webpack-plugin';
import findCacheDir from 'find-cache-dir';
import { ensureExists, babelPlugins, getNodeModules, getEnvironment, nodePaths } from './helper';

// takes options as an argument (ether derived from CLI or pack.json) and returns webpack options
export default async (options) => {
  // we want to allow cloud9 out of the box and support https
  const hostname = (process.env.C9_HOSTNAME && `http://${process.env.C9_HOSTNAME}`) ||
    `http${options.secure ? 's' : ''}://localhost:${options.port}/`;

  // watch or watchwrite trigger development mode
  const devMode = Boolean(options.watch || options.watchwrite);

  // passing extensions via CLI can be a bit weird, we normalise them here
  const additionalExtensions = ((options.resolve || '').match(/[\w\d]+/g) || []).map(
    ext => `.${ext}`,
  );

  // we have quite a few options to alter how the output looks, we group them here
  const jsPrefix = options.flatten ? '' : 'js/';
  const cssPrefix = options.flatten ? '' : 'css/';
  const imagesPrefix = options.flatten ? '' : 'images/';
  const fontsPrefix = options.flatten ? '' : 'fonts/';
  const mediaPrefix = options.flatten ? '' : 'media/';

  // to inject keys etc into a client bundle webpack replaces process.env.[NAME] when provided
  const environment = await getEnvironment(options);

  // parse environment for usage in webpack plugin
  const pluginEnvironment = Object.keys(environment).reduce((acc, cur) => Object.assign(acc, {
    [`process.env.${cur}`]: JSON.stringify(environment[cur]),
  }), {});

  // we need all installed node modules to prevent webpack from including them into a server bundle
  const nodeModules = options.node ? getNodeModules(options) : {};

  // we use a webpack plugin to serve some basic html to include scripts and bootstrap react
  const templateOptions = ensureExists(path.join(options.root, options.src, 'index.html'))
    ? {
      template: path.join(options.root, options.src, 'index.html'),
      inject: true,
    }
    : {};

  const createStyleLoaders = (extension, parser = false) => {
    // creates the stack of loaders to parse less/sass/css and prefix it
    const getInnerLoaders = cssModules => [
      {
        loader: 'css-loader',
        options: {
          // toggle css modules
          modules: cssModules,
          // classname for css modules
          localIdentName: devMode ? '[name]__[local]___[hash:base64:5]' : '[hash:base64]',
          // we use postcss, disable the prefixer here
          autoprefixer: false,
          // allow absolute import in stylesheets
          root: path.join(options.root, options.src),
          // used for followups in style sheet imports
          importLoaders: 1,
        },
      },
      // prefix css for better compatibility
      { loader: 'postcss-loader' },
      // include the parser (less / sass) as the first loader
      parser && {
        loader: `${parser}-loader`,
        options: {
          // allow root slash import
          includePaths: [path.join(options.root, options.src)],
          root: path.join(options.root, options.src),
        },
      },
    ].filter(Boolean);

    // wraps the inner stack for development (embedded) and production (extract into css file)
    const wrapInnerLoaders = (test, cssModules) => {
      const result = { test };
      if (devMode) {
        // style loader includes all stylesheets into the JS bundle in development
        result.use = [{ loader: 'style-loader' }].concat(getInnerLoaders(cssModules));
      } else {
        // in production we want a seperate minified stylesheet
        result.loader = ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: getInnerLoaders(cssModules),
        });
      }
      return result;
    };

    // allows bypassing css modules with .global.css
    if (options.cssmodules) {
      return {
        oneOf: [
          wrapInnerLoaders(new RegExp(`\\.global\\.${extension}$`, 'i'), false),
          wrapInnerLoaders(new RegExp(`\\.${extension}$`, 'i'), true),
        ],
      };
    }
    // if we disable css modules by default we want to opt-in for .modules.(css|scss|less) files
    return {
      oneOf: [
        wrapInnerLoaders(new RegExp(`\\.module\\.${extension}$`, 'i'), true),
        wrapInnerLoaders(new RegExp(`\\.${extension}$`, 'i'), false),
      ],
    };
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
      // hot-reloading for node development mode
      options.node && options.watch && 'webpack/hot/poll?1000',
      // react component hot reloading with persistent state
      options.react &&
        !options.node &&
        options.watch &&
        !options.watchwrite &&
        'react-hot-loader/patch',
      // entry point for browser hot reloading
      !options.node &&
        options.watch &&
        !options.watchwrite &&
        `webpack-dev-server/client?${hostname}`,
      // entry point for webpack dev server
      !options.node && options.watch && !options.watchwrite && 'webpack/hot/dev-server',
      // fetch polyfill is included as default
      !options.node && 'whatwg-fetch',
      // entry point is the main option
      (options.node || !options.react) && path.join(options.root, options.src, options.main),
      // in react mode we start with the pack-cli react entry point for component hot reloading
      !options.node && options.react && path.join(__dirname, 'react'),
    ].filter(Boolean),
    output: {
      path: path.join(options.root, options.dist),
      // assets gets normalises do /path/ before the options are passed
      publicPath: options.assets,
      // since we only output one JS file there is no need for a subfolder in node mode
      filename: `${options.node ? '' : jsPrefix}${options.bundle}.js`,
      pathinfo: devMode,
    },
    target: options.node ? 'node' : 'web',
    // can be used to include modules from a cdn or to prevent bundling additional modules in node
    externals: options.node ? nodeModules : options.externals || {},
    context: options.root,
    // this one is only for the loaders in development mode
    resolveLoader: {
      modules: [
        // for development or global install we want to resolve pack-cli node_modules as well
        ensureExistsRelative(path.join(__dirname, '..', 'node_modules')),
        ensureExistsRelative(path.join(__dirname, '..', '..', 'node_modules')),
        'node_modules',
      ].filter(Boolean),
    },
    resolve: {
      // the extensions that can be omitted when importing files
      extensions: ['.js', '.jsx', '.json', '.coffee'].concat(additionalExtensions),
      modules: [
        // allows to resolve react components as first class modules
        options.react && ensureExists(path.join(options.root, options.src, 'components')),
        // for global install
        ensureExistsRelative(path.join(__dirname, '..', 'node_modules')),
        ensureExistsRelative(path.join(__dirname, '..', '..', 'node_modules')),
        'node_modules',
      ]
        .filter(Boolean)
        .concat(
          // we resolve all global paths as well
          nodePaths.map(absolutePath => path.relative(options.root, absolutePath)),
        ),
      alias: [
        // we alias the main entry point as main, thats how the react wrapper finds the entry
        { main: path.join(options.root, options.src, options.main) },
        { src: path.join(options.root, options.src) },
        // react lite gets enabled via alias
        !options.watch &&
        !options.node &&
        options.lite && {
          react: 'react-lite',
          'react-dom': 'react-lite',
        },
      ]
        .filter(Boolean)
        // merge alias options
        .reduce((map, current) => Object.assign(map, current), {}),
    },
    watch: devMode,
    cache: true,
    bail: !devMode,
    performance: {
      // prevent warnings about file size in development mode
      hints: !devMode && 'warning',
    },
    module: {
      rules: [
        // javascript / jsx with babel
        {
          test: /\.jsx?$/,
          use: [
            {
              loader: 'babel-loader',
              options: babelPlugins(options, {
                cacheDirectory: devMode && findCacheDir({ name: 'pack' }),
              }),
            },
          ].filter(Boolean),
          exclude: /node_modules/,
        },

        // yaml config files
        {
          test: /\.yaml$/,
          use: ['json-loader', 'yaml-loader'],
        },

        // coffee-script
        {
          test: /\.coffee$/,
          use: ['coffee-loader'],
        },

        // import graphql
        !options.node && {
          test: /\.(graphql|gql)$/,
          exclude: /node_modules/,
          use: ['graphql-tag/loader'],
        },

        // import stylesheets and parse them correctly
        !options.node && createStyleLoaders('css'),
        !options.node && createStyleLoaders('scss', 'sass'),
        !options.node && createStyleLoaders('less', 'less'),

        // import images into browser bundle and minify / inline them if necccessary
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
                optipng: { optimizationLevel: 7 },
                gifsicle: { interlaced: false },
              },
            },
          ].filter(Boolean),
        },

        // allow webp images without optimize
        !options.node && {
          test: /\.(webp)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 5000,
                name: `${imagesPrefix}[name].[hash:base64:6].[ext]`,
              },
            },
          ],
        },

        // import html as raw text into the bundle for browser
        !options.node && {
          test: /\.html$/,
          use: ['raw-loader'],
        },

        // support for jade/pug, imports become a function that takes template vars and returns html
        {
          test: /\.(pug|jade)$/,
          use: [
            {
              loader: 'pug-loader',
              options: {
                root: path.join(options.root, options.src),
                basedir: path.join(options.root, options.src),
              },
            },
          ],
        },

        // allow import of webfonts into the bundle
        !options.node && {
          test: /\.(woff|ttf|eot|woff2|otf)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 5000,
                name: `${fontsPrefix}[name].[hash:base64:6].[ext]`,
              },
            },
          ],
        },

        // allow importing icons and movies into the application
        !options.node && {
          test: /\.(ico|mp4|webm)$/,
          use: [
            {
              loader: 'url-loader',
              options: {
                limit: 5000,
                name: `${mediaPrefix}[name].[hash:base64:6].[ext]`,
              },
            },
          ],
        },

        // when using node inline all allowed file types into the production bundle
        options.node && {
          // eslint-disable-next-line max-len
          test: /\.(css|scss|less|woff|ttf|eot|woff2|svg|ico|otf|webp|png|jpg|jpeg|gif|html|mp4|webm)$/,
          use: ['raw-loader'],
        },
      ].filter(Boolean),
    },

    // eval-source-map seems to be the only one that does reliable source maps in development
    devtool: (devMode && !options.node && 'eval-source-map') || 'source-map',

    plugins: [
      // allows hot reloading (module.hot / module.hot.accept)
      devMode && new webpack.HotModuleReplacementPlugin(),

      // ensures correct module names in development
      devMode && new webpack.NamedModulesPlugin(),

      // provides options to loaders, mostly backward compatibility with webpack 1
      new webpack.LoaderOptionsPlugin({
        minimize: !devMode,
        debug: devMode,
        options: {
          postcss: [
            // autoprefix css to maximise browser compatibility
            autoprefixer({
              browsers: ['>1%', 'last 4 versions', 'Firefox ESR', 'not ie < 9'],
            }),
          ],
        },
      }),

      // inline environment variables into bundle within process.env.KEY
      new webpack.DefinePlugin(pluginEnvironment),

      // minify bundle and apply tree-shaking / dead code elimination
      !devMode &&
        new webpack.optimize.UglifyJsPlugin({
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

      // extract css in production build
      !options.node && !devMode && new ExtractTextPlugin(`${cssPrefix}${options.bundle}.css`),

      // provide a simple html enty in development mode and include it in the bundle in quick mode
      !options.node &&
        (devMode || templateOptions.template || options.quick) &&
        !options.proxy &&
        new HtmlWebpackPlugin(templateOptions),

      // better debugging on case-insensitive operating systems (MacOS)
      devMode && new CaseSensitivePathsPlugin(),
    ].filter(Boolean),

    // allow __dirname and __filename in webpack
    node: {
      __dirname: false,
      __filename: false,
    },
  };
};
