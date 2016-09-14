const webpack = require('webpack');
const WebpackDevServer = require('webpack-dev-server');
const validate = require('webpack-validator');
const getConfig = require('./util/config');
const commander = require('commander');

commander
  .version('0.0.1')
  .description('start a development server')
  .option('-o, --output [directory]', 'output directory [dist]', 'dist')
  .option('-w, --watch', 'enable watch mode', false)
  .option('-p, --port [port]', 'port number [8080]', 8080)
  .option('-r, --react', 'enable react', false)
  .option('-c, --components [compdir]', 'react component dir [components]', 'components')
  .option('-s --source [srcdir]', 'source directory [src]', 'src')
  .option('-a --assets [pubdir]', 'assets directory [/]', '/')
  .option('-b --bundle [bundle]', 'bundle name [bundle]', 'bundle')
  .option('-m --main [main]', 'main filename [main]', 'main')
  .parse(process.argv);

const options = {
  root: process.cwd(),
};
const rawConfig = getConfig(Object.assign({}, commander, options));
const config = validate(rawConfig);
// console.log(config);

if (commander.watch) {
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
  });
  server.listen(commander.port);
  console.log(`http://localhost:${commander.port}/index.html`);
} else {
  webpack(config, () => console.log(config.output.path));
}
