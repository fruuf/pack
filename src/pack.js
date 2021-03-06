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
import { spawn } from 'child_process';
import { Observable, Subject, Scheduler } from 'rxjs';
import getConfig from './util/config';
import setupTest from './util/test';
import createScaffold from './util/scaffold';
import {
  DEFAULT_OPTIONS,
  VALID_OPTIONS,
  VALID_CLI_OPTIONS,
  VALID_FILE_OPTIONS,
} from './util/options';

// process.traceDeprecation = true;

let fileConfig = {};
let fileConfigSuccess = false;

// allow only valid options
const filterValidOptions = (data, validOptions) => Object.keys(validOptions).reduce((
  newData,
  option,
) => {
  if (validOptions[option] && option in data) {
    return Object.assign({}, newData, { [option]: data[option] });
  }
  return newData;
}, {});

const appendDefault = (option, str) => {
  let defaultValue = DEFAULT_OPTIONS[option];
  if (defaultValue === false) defaultValue = 'disabled';
  if (defaultValue === true) defaultValue = 'enabled';
  if (typeof defaultValue === 'object') defaultValue = '{}';
  return `${str} [${defaultValue}]`;
};

// cli options
commander
  .version(JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8')).version)
  .description('pack a bundle')
  .option('-w, --watch', appendDefault('watch', 'hot reload on file change (development)'))
  .option('-t, --test', appendDefault('test', 'run tests in test directory (development)'))
  .option(
    '-r, --react',
    appendDefault('react', 'render "export default <Component />" from sourcefile'),
  )
  .option('-l, --lite', appendDefault('lite', 'use react lite in build (production)'))
  .option('-c, --cssmodules', appendDefault('cssmodules', 'enable css modules'))
  .option('-n, --node', appendDefault('node', 'build for nodeJS'))
  .option(
    '-p, --port [number]',
    appendDefault('port', 'port number for development server (development)'),
  )
  .option('-q, --quick [filename]', appendDefault('quick', 'quick compile a file'))
  .option('-a, --assets [directory]', appendDefault('assets', 'assets directory on server'))
  .option('-s, --src [directory]', appendDefault('src', 'source directory'))
  .option('-m, --main [filename]', appendDefault('main', 'source filename in src'))
  .option('-d, --dist [directory]', appendDefault('dist', 'output directory'))
  .option('-b, --bundle [filename]', appendDefault('bundle', 'output filename in dist'))
  .option('--env [filename]', appendDefault('env', 'provide a file with environment variables'))
  .option(
    '--proxy [proxy/address]',
    appendDefault('proxy', 'proxy port or address for development server (development)'),
  )
  .option('--flatten', appendDefault('flatten', 'prevent subfolders in output'))
  .option(
    '--secure',
    appendDefault(
      'secure',
      'run the dev server as https and proxy to a https server if enabled (development)',
    ),
  )
  .option(
    '--watchwrite',
    appendDefault('watchwrite', 'write bundle on file change in (development)'),
  )
  .option(
    '--resolve [extensions]',
    appendDefault('resolve', 'resolve extensions other than .js, .json, .coffee'),
  )
  .option('--init', appendDefault('init', 'initialise an empty project in current directory'))
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
  const cleanUrl = String(assets).match(/^\/?(.*?)\/?$/)[1];
  if (cleanUrl === '') return '/';
  return `/${cleanUrl}/`;
};

const fileOptions = filterValidOptions(fileConfig, VALID_FILE_OPTIONS);
const cliOptions = filterValidOptions(commander, VALID_CLI_OPTIONS);
const quickOptions = commander.quick
  ? {
    src: path.dirname(commander.quick),
    main: path.basename(commander.quick, path.extname(commander.quick)),
    flatten: true,
    assets: '',
  }
  : {};

const tempOptions = Object.assign({}, DEFAULT_OPTIONS, quickOptions, fileOptions, cliOptions, {
  root: process.cwd(),
});

const options = Object.assign({}, tempOptions, { assets: normaliseAssets(tempOptions.assets) });

getConfig(options)
  .then((config) => {
    if (options.init) {
      createScaffold(options).then((result) => {
        if (result) {
          // eslint-disable-next-line no-console
          console.log(colors.bold.green('\n\n\n------ project initialised ------'));
        } else {
          // eslint-disable-next-line no-console
          console.error(colors.bold.red('\n\n\n------ project root must be empty ------'));
          process.exit(1);
        }
      });
    } else if (options.test) {
      const mocha = new Mocha();
      // runs async to allow fetching the environment
      setupTest(options).then(() => {
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
    } else if (options.node && options.watch) {
      // delete an existing bundle first, then run the process
      fs.unlink(path.join(config.output.path, config.output.filename), () => {
        // emits every time webpack updates the bundle
        const webpackStream = Observable.create((observer) => {
          webpack(config, (directError, stats) => {
            observer.next(stats);
            if (directError) observer.error(directError);
          });
        })
          .share();

        // signal to (re)start the process
        const startSignalSubject = new Subject();

        // signal to stop the process if there are compiling errors
        const stopSignalSubject = new Subject();

        // executes the node bundle
        const statusStream = startSignalSubject
          // we delay the start to the next tick
          .observeOn(Scheduler.async)
          .switchMap(() => Observable.create((observer) => {
            observer.next({
              type: 'start',
            });
            const proc = spawn(
              `node --inspect=9229 ${path.join(options.dist, `${options.bundle}.js`)}`,
              { cwd: options.root, shell: true },
            );

            proc.stdout.on('data', data => observer.next({
              type: 'data',
              data: data.toString('utf-8'),
            }));

            proc.stderr.on('data', data => observer.next({
              type: 'error',
              data: data.toString('utf-8'),
            }));

            // stop the process on the next tick if the signal is given
            const stopSubscription = stopSignalSubject
              .take(1)
              .observeOn(Scheduler.async)
              .subscribe(() => proc.kill());
            proc.on('close', (data) => {
              // we can only stop the process once
              stopSubscription.unsubscribe();
              observer.next({
                type: 'stop',
                data: String(data),
              });
            });
          }))
          .share();

        // always has the current process running status
        const isRunningStream = Observable.merge(
            statusStream.filter(status => status.type === 'start').mapTo(true),
            statusStream.filter(status => status.type === 'stop').mapTo(false),
          )
          .startWith(false)
          .distinctUntilChanged()
          .publishReplay(1);

        isRunningStream.connect();

        // if webpack has errors stop the server
        webpackStream
          .map(stats => Boolean(stats.compilation.errors.length))
          .filter(Boolean)
          .subscribe(stopSignalSubject);

        webpackStream
          // only start when a new build is created and the process is not running
          .withLatestFrom(isRunningStream)
          .filter(([, isRunning]) => !isRunning)
          // restart the process when a hot update cant be applied
          .merge(
            statusStream
              .filter(status =>
                Boolean(
                  String(status.data).match(
                    /\[HMR\]\s+you\s+need\s+to\s+restart\s+the\s+application/i,
                  ),
                ))
              // stop the process
              .do(() => stopSignalSubject.next())
              // send start as soon as the process has stopped
              .switchMapTo(isRunningStream)
              .filter(isRunning => !isRunning),
          )
          .withLatestFrom(webpackStream)
          .map(([, stats]) => stats.hash)
          .distinctUntilChanged()
          .subscribe(startSignalSubject);

        const hiddenErrors = [
          /debugger\s+listening\s+on\s+port/i,
          /Update\s+propagation/i,
          /to\s+start\s+debugging,\s+open\s+the\s+following\s+URL\s+in\s+chrome/i,
          /\[HMR\]\s+Cannot\s+apply\s+update/,
          /chrome-devtools:\/\/devtools/i,
        ];
        // log the output of the process
        statusStream
          .filter(status => status.type === 'data')
          .map(status => status.data)
          .merge(
            statusStream
              .filter(status => status.type === 'error')
              .filter(status => !hiddenErrors.some(regExp => regExp.test(String(status.data))))
              .map(status => colors.red(status.data)),
            statusStream
              .filter(status => status.type === 'close')
              .map(status => colors.red(`closed (${status.data})`)),
            statusStream
              .filter(status => status.type === 'start')
              .map(() =>
                colors.green(
                  `\n\n\n------ started ${path.join(options.src, options.main)} ------`,
                )),
          )
          // eslint-disable-next-line no-console
          .subscribe(text => console.log(text));
      });
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
          console.log(
            colors.red(
              stats.compilation.errors.map(error => error.message).join('\n\n\n------\n\n'),
            ),
          );
          process.exit(1);
        } else {
          if (options.watchwrite) {
            // create an empty stylesheet to prevent http errors in development
            const styleFilename = path.join(
              options.root,
              options.dist,
              (!options.flatten && 'css') || '',
              `${options.bundle}.css`,
            );
            mkdirp.sync(path.dirname(styleFilename));
            fs.writeFileSync(styleFilename, '/* css gets only generated for production bundle */', {
              encoding: 'utf8',
              flag: 'w',
            });
          }
          // eslint-disable-next-line no-console
          console.log(colors.bold.green(`\n\n\n------ build succeeded for ${options.src} ------`));
          // eslint-disable-next-line no-console
          console.log(
            stats.toString({
              chunks: false,
              colors: true,
            }),
          );
          const statsFile = path.join(process.cwd(), options.dist, 'stats.json');
          const statsObj = stats.toJson();
          jsonfile.writeFile(statsFile, statsObj);
        }
      });
    }
  })
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(colors.bold.red(`\n\n\n------ build failed for ${options.src} ------`));
    // eslint-disable-next-line no-console
    console.log(e);
    process.exit(1);
  });
