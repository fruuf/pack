import latestVersion from 'latest-version';
import fs from 'fs';
import path from 'path';
import { DEFAULT_OPTIONS, VALID_FILE_OPTIONS } from './options';

// an example unit test
const testContent = () => `describe('main', () => {
  it('runs a test', () => {
    expect(true).to.equal(true);
  });
});
`;

// example react unit test
const testReactContent = options => `import React from 'react';
import Component from './${options.main}';

describe('${options.main}', () => {
  const wrapper = mount(<Component />);
  it('mounts component', () => {
    expect(wrapper).to.be.present();
  });
});
`;

// example content
const mainContent = () => `// eslint-disable-next-line no-console
console.log('example');
`;

// example react content
const mainReactContent = () => `import React from 'react';

export default () => (
  <h1>example</h1>
);
`;

const dependencyList = options => ([
  // a node app might require babel-runtime for polyfills (generators etc)
  options.node && 'babel-runtime',
  options.react && 'react',
].filter(Boolean));

const devDependencyList = () => ([
  // the default eslint has problems with more recent babel features
  'babel-eslint',
  'eslint',
  // airbnb and peer dependencies of it
  'eslint-config-airbnb',
  'eslint-plugin-import',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react',
  // pack-cli needs to be present in development
  'pack-cli',
]);

// runs latestVersion on all dependencies and converts them into package.json format
const foldDependencies = async (depsList) => {
  const latestVersions = await Promise.all(depsList.map(latestVersion));
  return depsList.reduce(
    (acc, cur, index) => Object.assign(acc, { [cur]: `^${latestVersions[index]}` })
    , {},
  );
};

// check if the directory is empty
const checkDirectory = async dir => new Promise((resolve) => {
  fs.readdir(dir, (err, files) => {
    if (err) {
      resolve(false);
    } else {
      // hidden files are ok
      const unhiddenFiles = files.filter(file => /^[^.]/.test(file));
      resolve(unhiddenFiles.length === 0);
    }
  });
});


const createPackageJson = async (options) => {
  // wrap into packageJson format
  const dependencies = await foldDependencies(dependencyList(options));
  const devDependencies = await foldDependencies(devDependencyList(options));

  // entry scripts
  const packageJson = {
    scripts: {
      start: 'pack -w',
      test: `eslint ${options.src} && pack -t`,
      build: 'pack',
    },
    dependencies,
    devDependencies,
  };

  return packageJson;
};

const createEslintRc = async options => ({
  // the default parser has problems with more recent babel features
  parser: 'babel-eslint',
  extends: 'airbnb',
  env: [
    'mocha',
    // enable environments based on provided options
    !options.node && 'browser',
    options.node && 'node',
  ].filter(Boolean).reduce(
    // zip array elements to object keys with value true
    (acc, cur) => Object.assign(acc, { [cur]: true }),
    {},
  ),
  // we allow the latest ecmaVersion
  parserOptions: { ecmaVersion: 8 },
  rules: {
    // needed for hot reloading
    'global-require': 0,
    // we allow absolute path that resolves to the src directory
    'import/no-unresolved': 0,
    'import/no-absolute-path': 0,
    // jsx files get included as default and jsx in pure js files is fine as well
    'react/jsx-filename-extension': 0,
    'import/extensions': 0,
  },
  globals: [
    // expect is provided as a global in unit tests
    'expect',
    // we use proces.env for environment variables
    'process',
    // react unit tests have enzyme bound to the function mount(<Component {...props} />)
    options.react && 'mount',
    // we include a fetch polyfill in browser mode
    !options.node && 'fetch',
  ].filter(Boolean).reduce(
    // zip to object keys with value true
    (acc, cur) => Object.assign(acc, { [cur]: true }),
    {},
  ),
});

const createPackJson = async options => Object.keys(VALID_FILE_OPTIONS)
  // filter only allowed options for pack.json file
  .filter(option => VALID_FILE_OPTIONS[option])
  // filter only the ones that are non-default
  .filter(option => DEFAULT_OPTIONS[option] !== options[option])
  // zip them into an object and return
  .reduce((acc, option) => Object.assign(acc, { [option]: options[option] }), {});


export default async (options) => {
  // the directory needs to be empty
  if (await checkDirectory(options.root)) {
    // create config files
    const packageJson = await createPackageJson(options);
    const packJson = await createPackJson(options);
    const eslintRc = await createEslintRc(options);

    // create source directory
    fs.mkdirSync(path.join(options.root, options.src));

    // write config files
    fs.writeFileSync(path.join(options.root, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(options.root, '.eslintrc'), JSON.stringify(eslintRc, null, 2));

    // write pack.json into root if src is non-default
    if (options.src === 'src') {
      fs.writeFileSync(path.join(options.root, options.src, 'pack.json'), JSON.stringify(packJson, null, 2));
    } else {
      fs.writeFileSync(path.join(options.root, 'pack.json'), JSON.stringify(packJson, null, 2));
    }

    // write example unit test
    fs.writeFileSync(
      path.join(options.root, options.src, `${options.main}.test.js`),
      options.react ? testReactContent(options) : testContent(options),
    );

    // write example entry point
    fs.writeFileSync(
      path.join(options.root, options.src, `${options.main}.js`),
      options.react ? mainReactContent(options) : mainContent(options),
    );

    return true;
  }
  return false;
};
