const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const validate = require('webpack-validator');
const getConfig = require('./util/config');
const commander = require('commander');
const path = require('path');
const jsonfile = require('jsonfile');

var fileConfig = {}; // eslint-disable-line no-var
var fileConfigSuccess = false; // eslint-disable-line no-var

commander
  .version('0.2.15')
  .description('pack a bundle')
  .option('-n, --node', 'enable node mode', false)
  .option('-w, --watch', 'enable watch mode', false)
  .option('-f --filewatch', 'enable file watch mode', false)
  .option('-r, --react', 'enable react', false)
  .option('-m, --modules', 'enable css modules', false)
  .option('-g, --global', 'provide when global installed', false)
  .option('-s, --src [srcdir]', 'source directory [src]', 'src')
  .option('-o, --output [directory]', 'output directory [dist]', 'dist')
  .option('-a, --assets [pubdir]', 'assets directory []', '')
  .option('-p, --port [port]', 'port number [8080]', 8080)
  .option('--react', 'enable react lite', false)
  .option('--bundle [bundle]', 'bundle name [bundle]', 'bundle')
  .option('--main [main]', 'main filename [main]', 'main')
  .option('--static [staticdir]', 'static folder for development server []', '')
  .option('--proxy [proxy]', 'proxy port or server []', '')
  .option('--template [template]', 'html template [index.html]', 'index.html')
  .option('--components [compdir]', 'react component dir [components]', 'components')
  .option('--resolve [resolve]', 'resolve additional extensions []', '')
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

const normaliseAssets = (assets) => {
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
    contentBase: (options.static && !options.proxy) && path.join(process.cwd(), options.static),
  });
  server.listen(options.port, '0.0.0.0');
  // eslint-disable-next-line no-console
  console.log(`http://localhost:${options.port}`);
} else {
  webpack(config, (directError, stats) => {
    if (directError) throw new Error(directError);
    // eslint-disable-next-line no-console
    console.log(stats.toString({
      chunks: false, // Makes the build much quieter
      colors: true,
    }));
    const statsFile = path.join(process.cwd(), options.output, 'stats.json');
    const statsObj = stats.toJson();
    jsonfile.writeFile(statsFile, statsObj);
  });
}
