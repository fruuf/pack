import webpack from 'webpack';
import WebpackDevServer from 'webpack-dev-server';
import validate from 'webpack-validator';
import commander from 'commander';
import path from 'path';
import jsonfile from 'jsonfile';
import difference from 'lodash/difference';
import pick from 'lodash/pick';
import colors from 'colors/safe';
import Mocha from 'mocha';
import fs from 'fs';
import glob from 'glob';
import getConfig from './util/config';
import setupTest from './util/test';

let fileConfig = {}; // eslint-disable-line no-var
let fileConfigSuccess = false; // eslint-disable-line no-var

const VALID_OPTIONS = [
  'watch',
  'react',
  'lite',
  'cssmodules',
  'node',
  'flatten',
  'port',
  'assets',
  'src',
  'test',
  'main',
  'dist',
  'bundle',
  'proxy',
  'watchwrite',
  'resolve',
  'index',
  'externals',
];

commander
  .version(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version)
  .description('pack a bundle')
  .option(
    '-w, --watch',
    'hot reload on file change (development)',
    false
  )
  .option(
    '-t, --test',
    'run tests in test directory (development)',
    false
  )
  .option(
    '-r, --react',
    'render "export default <Component />" from sourcefile',
    false
  )
  .option(
    '-l, --lite',
    'use react lite in build (production)',
    false
  )
  .option(
    '-c, --cssmodules',
    'enable css modules',
    false
  )
  .option(
    '-n, --node',
    'build for nodeJS',
    false
  )
  .option(
    '-f, --flatten',
    'prevent subfolders in output',
    false
  )
  .option(
    '-p, --port [number]',
    'port number for development server (development) [8080]',
    8080
  )
  .option(
    '-a, --assets [directory]',
    'assets directory on server [assets]',
    'assets'
  )
  .option(
    '-s, --src [directory]',
    'source directory [src]',
    'src'
  )
  .option(
    '-m, --main [filename]',
    'source filename in src [main]',
    'main'
  )
  .option(
    '-d, --dist [directory]',
    'output directory [dist]',
    'dist'
  )
  .option(
    '-b, --bundle [filename]',
    'output filename in dist [bundle]',
    'bundle'
  )
  .option(
    '--proxy [proxy/address]',
    'proxy port or address for development server (development) []',
    ''
  )
  .option(
    '--watchwrite',
    'write bundle on file change in (development)',
    false
  )
  .option(
    '--resolve [extensions]',
    'resolve extensions other than .js, .json, .coffee []'
    , ''
  )
  .option(
    '--index [filename]',
    'html entry file in src [index.html]',
    'index.html'
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

attemptFileConfig(path.join(process.cwd(), commander.src, 'pack.json'));
attemptFileConfig(path.join(process.cwd(), 'pack.json'));

const invalidFileOptions = difference(Object.keys(fileConfig), VALID_OPTIONS);
if (invalidFileOptions.length) {
  throw new Error(`Invalid file options provided: ${invalidFileOptions.join(', ')}`);
}

const normaliseAssets = (assets) => {
  const cleanUrl = path.normalize(String(assets));
  if (cleanUrl === '.') return '/';
  return `${cleanUrl[0] === '/' ? '' : '/'}${cleanUrl}/`;
};

const tempOptions = Object.assign(
  pick(commander, VALID_OPTIONS),
  pick(fileConfig, VALID_OPTIONS),
  { root: process.cwd() }
);
const options = Object.assign({}, tempOptions, { assets: normaliseAssets(tempOptions.assets) });
const rawConfig = getConfig(options);
const config = validate(rawConfig);


if (options.test) {
  const mocha = new Mocha();
  setupTest(options);
  const globPattern = path.join(options.src, '**/*.test.js');
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
      console.log(colors.bold.green(`\n\n\n------ tests passed ------`));
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
    proxy: options.proxy
      ? { '**': String(options.proxy).match(/^\d+$/)
        ? `http://localhost:${options.proxy}`
        : String(options.proxy),
      }
      : {},
  });
  server.listen(options.port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`http://localhost:${options.port}`);
} else {
  webpack(config, (directError, stats) => {
    if (directError) {
      // eslint-disable-next-line no-console
      console.error(colors.bold.red(`\n\n\n------ build failed for ${options.src} ------`));
      // eslint-disable-next-line no-console
      console.error(directError.message);
      process.exit(1);
    } else {
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
