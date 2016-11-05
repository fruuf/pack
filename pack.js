const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const validate = require('webpack-validator');
const getConfig = require('./util/config');
const commander = require('commander');
const path = require('path');
const jsonfile = require('jsonfile');
const difference = require('lodash/difference');
const pick = require('lodash/pick');

var fileConfig = {}; // eslint-disable-line no-var
var fileConfigSuccess = false; // eslint-disable-line no-var

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
  'main',
  'dist',
  'bundle',
  'proxy',
  'watchwrite',
  'resolve',
  'index',
  'components',
  'externals',
];

commander
  .version('1.0.1')
  .description('pack a bundle')
  .option(
    '-w, --watch',
    'hot reload on file change (development)',
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
  .option(
    '--components [directory]',
    'directory for react components in src [components]',
    'components'
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
attemptFileConfig(path.join(process.cwd(), commander.src, '.packrc'));
attemptFileConfig(path.join(process.cwd(), '.packrc'));


const invalidFileOptions = difference(Object.keys(fileConfig), VALID_OPTIONS);
if (invalidFileOptions.length) {
  throw new Error(`Invalid file options provided: ${invalidFileOptions.join(', ')}`);
}
const options = Object.assign(
  pick(commander, VALID_OPTIONS),
  pick(fileConfig, VALID_OPTIONS),
  { root: process.cwd() }
);
const rawConfig = getConfig(options);
const config = validate(rawConfig);

if (options.watch && !options.node) {
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
    historyApiFallback: !options.proxy && { index: options.assets },
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
    if (directError) throw new Error(directError);
    // eslint-disable-next-line no-console
    console.log(stats.toString({
      chunks: false,
      colors: true,
    }));
    const statsFile = path.join(process.cwd(), options.dist, 'stats.json');
    const statsObj = stats.toJson();
    jsonfile.writeFile(statsFile, statsObj);
  });
}
