const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const validate = require('webpack-validator');
const getConfig = require('./util/config');
const commander = require('commander');
const path = require('path');
const jsonfile = require('jsonfile');

commander
  .version('0.2.5')
  .description('pack a bundle')
  .option('-n, --node', 'enable node mode', false)
  .option('-w, --watch', 'enable watch mode', false)
  .option('-l, --lint', 'enable linter', false)
  .option('-r, --react', 'enable react', false)
  .option('-e, --env', 'load .env file', false)
  .option('-m, --modules', 'enable css modules', false)
  .option('-s, --src [srcdir]', 'source directory [src]', 'src')
  .option('-o, --output [directory]', 'output directory [dist]', 'dist')
  .option('-a, --assets [pubdir]', 'assets directory []', '')
  .option('-p, --port [port]', 'port number [8080]', 8080)
  .option('--bundle [bundle]', 'bundle name [bundle]', 'bundle')
  .option('--main [main]', 'main filename [main]', 'main')
  .option('--static [staticdir]', 'static folder for development server []', '')
  .option('--proxy [proxy]', 'proxy port or server []', '')
  .option('--template [template]', 'html template [index.html]', 'index.html')
  .option('--components [compdir]', 'react component dir [components]', 'components')
  .parse(process.argv);

var fileConfig = {};
try {
  fileConfig = jsonfile.readFileSync(path.join(process.cwd(), commander.src, '.packrc'));
} catch (e1) {
  try {
    fileConfig = jsonfile.readFileSync(path.join(process.cwd(), '.packrc'));
  } catch (e2) {}
}

const normaliseAssets = assets => {
  const cleanUrl = path.normalize(String(assets));
  if (cleanUrl === '.') return '/';
  return `${cleanUrl[0] === '/' ? '' : '/'}${cleanUrl}/`;
};

const options = Object.assign({}, commander, fileConfig, {
  root: process.cwd(),
});
options.assets = normaliseAssets(options.assets);
const rawConfig = getConfig(options);
const config = validate(rawConfig);

if (commander.watch && !commander.node) {
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
    historyApiFallback: !commander.proxy && { index: commander.assets },
    proxy: commander.proxy
      ? { '**': String(commander.proxy).match(/^\d+$/)
        ? `http://localhost:${commander.proxy}`
        : String(commander.proxy),
      }
      : {},
    contentBase: (commander.static && !commander.proxy) && path.join(process.cwd(), commander.static),
  });
  server.listen(commander.port);
  console.log(`http://localhost:${commander.port}`);
} else {
  webpack(config, (directError, stats) => {
    if (directError) throw new Error(directError);
    console.log(stats.toString({
      chunks: false, // Makes the build much quieter
      colors: true,
    }));
  });
}
