import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import commander from 'commander';
import path from 'path';
import jsonfile from 'jsonfile';
import colors from 'colors/safe';
import Mocha from 'mocha';
import fs from 'fs';
import glob from 'glob';
import mkdirp from 'mkdirp';
import getConfig from './util/config';
import setupTest from './util/test';

let fileConfig = {}; // eslint-disable-line no-var
let fileConfigSuccess = false; // eslint-disable-line no-var

const DEFAULT_OPTIONS = {
  watch: false,
  react: false,
  lite: false,
  cssmodules: false,
  node: false,
  flatten: false,
  port: '8080',
  assets: 'assets',
  src: 'src',
  test: false,
  main: 'main',
  dist: 'dist',
  bundle: 'bundle',
  env: '',
  proxy: '',
  secure: false,
  watchwrite: false,
  resolve: '',
  index: 'index.html',
  quick: false,
  externals: {},
};

const VALID_OPTIONS = {
  watch: true,
  react: true,
  lite: true,
  cssmodules: true,
  node: true,
  flatten: true,
  port: true,
  assets: true,
  src: true,
  test: true,
  main: true,
  dist: true,
  env: true,
  bundle: true,
  proxy: true,
  secure: true,
  watchwrite: true,
  resolve: true,
  index: true,
  quick: true,
  externals: true,
};

const VALID_FILE_OPTIONS = Object.assign({}, VALID_OPTIONS, {
  watch: false,
  test: false,
  watchwrite: false,
  quick: false,
});

const VALID_CLI_OPTIONS = Object.assign({}, VALID_OPTIONS, {
  externals: false,
});

const pick = (data, validOptions) => Object.keys(validOptions).reduce((newData, option) => {
  if (validOptions[option] && option in data) {
    return Object.assign({}, newData, { [option]: data[option] });
  }
  return newData;
}, {});

const appendDefault = (option, str) => {
  let defaultValue = DEFAULT_OPTIONS[option];
  if (defaultValue === false) defaultValue = 'disabled';
  if (defaultValue === true) defaultValue = 'enabled';
  if (typeof (defaultValue) === 'object') defaultValue = '{}';
  return `${str} [${defaultValue}]`;
};

commander
  .version(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version)
  .description('pack a bundle')
  .option(
    '-w, --watch',
    appendDefault('watch', 'hot reload on file change (development)'),
  )
  .option(
    '-t, --test',
    appendDefault('test', 'run tests in test directory (development)'),
  )
  .option(
    '-r, --react',
    appendDefault('react', 'render "export default <Component />" from sourcefile'),
  )
  .option(
    '-l, --lite',
    appendDefault('lite', 'use react lite in build (production)'),
  )
  .option(
    '-c, --cssmodules',
    appendDefault('cssmodules', 'enable css modules'),
  )
  .option(
    '-n, --node',
    appendDefault('node', 'build for nodeJS'),
  )
  .option(
    '-f, --flatten',
    appendDefault('flatten', 'prevent subfolders in output'),
  )
  .option(
    '-p, --port [number]',
    appendDefault('port', 'port number for development server (development)'),
  )
  .option(
    '-a, --assets [directory]',
    appendDefault('assets', 'assets directory on server'),
  )
  .option(
    '-s, --src [directory]',
    appendDefault('src', 'source directory'),
  )
  .option(
    '-m, --main [filename]',
    appendDefault('main', 'source filename in src'),
  )
  .option(
    '-d, --dist [directory]',
    appendDefault('dist', 'output directory'),
  )
  .option(
    '-b, --bundle [filename]',
    appendDefault('bundle', 'output filename in dist'),
  )
  .option(
    '--env [filename]',
    appendDefault('env', 'provide a file with environment variables'),
  )
  .option(
    '-q, --quick [filename]',
    appendDefault('quick', 'quick compile a file'),
  )
  .option(
    '--proxy [proxy/address]',
    appendDefault('proxy', 'proxy port or address for development server (development)'),
  )
  .option(
    '--secure',
    appendDefault('secure', 'run the dev server as https and proxy to a https server if enabled (development)'),
  )
  .option(
    '--watchwrite',
    appendDefault('watchwrite', 'write bundle on file change in (development)'),
  )
  .option(
    '--resolve [extensions]',
    appendDefault('resolve', 'resolve extensions other than .js, .json, .coffee'),
  )
  .option(
    '--index [filename]',
    appendDefault('index', 'html entry file in src'),
  )
  .parse(process.argv);

const attemptFileConfig = (fileName) => {
  if (fileConfigSuccess) return false;
  try {
    fileConfig = jsonfile.readFileSync(fileName);
    fileConfigSuccess = true;
    return true;
  } catch (e) {
    if (e.name === 'SyntaxError') {
      throw new Error(`invalid json in ${fileName}`);
    }
    return false;
  }
};

attemptFileConfig(path.join(process.cwd(), commander.src || 'src', 'pack.json'));
attemptFileConfig(path.join(process.cwd(), 'pack.json'));

const invalidFileOptions = Object.keys(fileConfig).filter(option => !VALID_OPTIONS[option]);
if (invalidFileOptions.length) {
  throw new Error(`Invalid file options provided: ${invalidFileOptions.join(', ')}`);
}

const normaliseAssets = (assets) => {
  const cleanUrl = path.normalize(String(assets));
  if (cleanUrl === '.') return '/';
  return `${cleanUrl[0] === '/' ? '' : '/'}${cleanUrl}/`;
};

const fileOptions = pick(fileConfig, VALID_FILE_OPTIONS);
const cliOptions = pick(commander, VALID_CLI_OPTIONS);
const quickOptions = commander.quick
  ? {
    src: path.dirname(commander.quick),
    main: path.basename(commander.quick, path.extname(commander.quick)),
    flatten: true,
    assets: '',
  }
  : {};

const tempOptions = Object.assign(
  {},
  DEFAULT_OPTIONS,
  quickOptions,
  fileOptions,
  cliOptions,
  { root: process.cwd() },
);
const options = Object.assign({}, tempOptions, { assets: normaliseAssets(tempOptions.assets) });

getConfig(options).then((config) => {
  if (options.test) {
    const mocha = new Mocha();
    setupTest(options);
    const globPattern = path.join(options.src, '**/*test.js');
    const testFiles = glob.sync(globPattern, {
      cwd: options.root,
      ignore: 'node_modules/**',
    });
    mocha.addFile(path.join(__dirname, 'util/test.js'));
    testFiles.forEach((testFile) => {
      mocha.addFile(path.join(options.root, testFile));
    });
    mocha.run((failures) => {
      if (failures === 0) {
        // eslint-disable-next-line no-console
        console.log(colors.bold.green('\n\n\n------ tests passed ------'));
      } else {
        // eslint-disable-next-line no-console
        console.error(colors.bold.red(`\n\n\n------ ${failures} tests failed ------`));
        process.exit(1);
      }
    });
  } else if (options.watch && !options.node) {
    const compiler = webpack(config);
    const server = new WebpackDevServer(compiler, {
      publicPath: config.output.publicPath,
      stats: {
        colors: true,
        hash: false,
        timings: true,
        chunks: false,
        chunkModules: false,
        modules: false,
      },
      hot: true,
      inline: true,
      historyApiFallback: !options.proxy && { index: path.join(options.assets, 'index.html') },
      https: Boolean(options.secure),
      proxy: options.proxy
        ? {
          '**': {
            target: String(options.proxy).match(/^\d+$/)
              ? `http${options.secure ? 's' : ''}://localhost:${options.proxy}`
              : String(options.proxy),
            secure: false, // lets ignore self-signed certs
          },
        }
        : {},
    });
    server.listen(options.port, '0.0.0.0');
    // eslint-disable-next-line no-console
    console.log(`http${options.secure ? 's' : ''}://localhost:${options.port}`);
  } else {
    webpack(config, (directError, stats) => {
      if (directError) {
        // eslint-disable-next-line no-console
        console.error(colors.bold.red(`\n\n\n------ build failed for ${options.src} ------`));
        // eslint-disable-next-line no-console
        console.error(directError.message);
        process.exit(1);
      } else if (stats.compilation.errors && stats.compilation.errors.length) {
        // eslint-disable-next-line no-console
        console.error(colors.bold.red(`\n\n\n------ build failed for ${options.src} ------`));
        // eslint-disable-next-line no-console
        console.log(colors.red(
          stats.compilation.errors.map(error => error.message)
          .join('\n\n\n------\n\n'),
        ));
        process.exit(1);
      } else {
        if (options.watchwrite) {
          // create an empty stylesheet to prevent http errors in development
          const styleFilename = path.join(options.root, options.dist, (!options.flatten && 'css') || '', `${options.bundle}.css`);
          mkdirp.sync(path.dirname(styleFilename));
          fs.writeFileSync(styleFilename, '/* css gets only generated for production bundle */', {
            encoding: 'utf8',
            flag: 'w',
          });
        }
        // eslint-disable-next-line no-console
        console.log(colors.bold.green(`\n\n\n------ build succeeded for ${options.src} ------`));
        // eslint-disable-next-line no-console
        console.log(stats.toString({
          chunks: false,
          colors: true,
        }));
        const statsFile = path.join(process.cwd(), options.dist, 'stats.json');
        const statsObj = stats.toJson();
        jsonfile.writeFile(statsFile, statsObj);
      }
    });
  }
});
