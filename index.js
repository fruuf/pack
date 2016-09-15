const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const validate = require('webpack-validator');
const getConfig = require('./util/config');
const commander = require('commander');
const path = require('path');


let serverUpdateCount = 0;

commander
  .version('0.1.3')
  .description('pack a bundle')
  .option('-n, --node', 'enable node mode', false)
  .option('-w, --watch', 'enable watch mode', false)
  .option('-r, --react', 'enable react', false)
  .option('-e, --env', 'load .env file', false)
  .option('-s --src [srcdir]', 'source directory [src]', 'src')
  .option('-o, --output [directory]', 'output directory [dist]', 'dist')
  .option('-a --assets [pubdir]', 'assets directory []', '')
  .option('-p, --port [port]', 'port number [8080]', 8080)
  .option('--bundle [bundle]', 'bundle name [bundle]', 'bundle')
  .option('--main [main]', 'main filename [main]', 'main')
  .option('--static [staticdir]', 'static folder for development server []', '')
  .option('--proxy [proxy]', 'proxy port or server []', '')
  .option('--components [compdir]', 'react component dir [components]', 'components')
  .parse(process.argv);

const normaliseAssets = assets => {
  const cleanUrl = path.normalize(String(assets));
  if (cleanUrl === '.') return '/';
  return `${cleanUrl[0] === '/' ? '' : '/'}${cleanUrl}/`;
};

commander.assets = normaliseAssets(commander.assets);

const options = {
  root: process.cwd(),
};
const rawConfig = getConfig(Object.assign({}, commander, options));
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
    quiet: true,
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
  webpack(config, (directError, result) => {
    const errors = (directError && [directError])
      || (result && result.compilation && result.compilation.errors)
      || ([]);
    if (errors.length) {
      errors.forEach(error => console.error(error.message || error));
    } else if (commander.node && commander.watch) {
      console.log(`${config.output.path}${serverUpdateCount ? ` (${serverUpdateCount})` : ''}`);
      serverUpdateCount++;
    } else {
      console.log(config.output.path);
    }
  });
}
