import latestVersion from 'latest-version';
import fs from 'fs';
import path from 'path';
import { DEFAULT_OPTIONS, VALID_FILE_OPTIONS } from './options';

const testContent = `describe('main', () => {
  it('hello world', () => {
    expect(true).to.equal(true);
  });
});
`;

const testReactContent = `import React from 'react';
import Main from './main';

describe('main', () => {
  const wrapper = mount(<Main />);
  it('mounts', () => {
    expect(wrapper).to.be.present();
  });
});
`;

const mainContent = `// eslint-disable-next-line no-console
console.log('hello world');
`;

const mainReactContent = `import React from 'react';

export default () => (
  <h1>hello world</h1>
);
`;

const dependencyList = options => ([
  options.node && 'babel-runtime',
  options.react && 'react',
].filter(Boolean));

const devDependencyList = () => ([
  'babel-eslint',
  'eslint',
  'eslint-config-airbnb',
  'eslint-plugin-import',
  'eslint-plugin-jsx-a11y',
  'eslint-plugin-react',
  'pack-cli',
]);

const foldDependencies = async (depsList) => {
  const latestVersions = await Promise.all(depsList.map(latestVersion));
  return depsList.reduce(
    (acc, cur, index) => Object.assign(acc, { [cur]: `^${latestVersions[index]}` })
    , {},
  );
};

const checkDirectory = async dir => new Promise((resolve) => {
  fs.readdir(dir, (err, files) => {
    if (err) {
      resolve(false);
    } else {
      const unhiddenFiles = files.filter(file => /^[^.]/.test(file));
      resolve(unhiddenFiles.length === 0);
    }
  });
});

const createPackageJson = async (options) => {
  const dependencies = await foldDependencies(dependencyList(options));
  const devDependencies = await foldDependencies(devDependencyList(options));
  const src = options.src !== 'src';
  const packageJson = {
    scripts: {
      start: `pack -w${src ? `s ${options.src}` : ''}`,
      test: `eslint ${options.src} && pack -t${src ? `s ${options.src}` : ''}`,
      build: `pack${src ? ` -s ${options.src}` : ''}`,
    },
    dependencies,
    devDependencies,
  };
  return packageJson;
};

const createEslintRc = async options => ({
  parser: 'babel-eslint',
  extends: 'airbnb',
  env: [
    'mocha',
    !options.node && 'browser',
    options.node && 'node',
  ].filter(Boolean).reduce((acc, cur) => Object.assign(acc, { [cur]: true }), {}),
  parserOptions: { ecmaVersion: 8 },
  rules: {
    'global-require': 0,
    'import/no-unresolved': 0,
    'import/no-absolute-path': 0,
    'react/jsx-filename-extension': 0,
    'import/extensions': 0,
  },
  globals: [
    'expect',
    'process',
    options.react && 'mount',
  ].filter(Boolean).reduce((acc, cur) => Object.assign(acc, { [cur]: true }), {}),
});

const createPackJson = async options => Object.keys(VALID_FILE_OPTIONS)
  .filter(option => VALID_FILE_OPTIONS[option])
  .filter(option => DEFAULT_OPTIONS[option] !== options[option])
  .reduce((acc, option) => Object.assign(acc, { [option]: options[option] }), {});

export default async (options) => {
  if (await checkDirectory(options.root)) {
    const packageJson = await createPackageJson(options);
    const packJson = await createPackJson(options);
    const eslintRc = await createEslintRc(options);
    fs.mkdirSync(path.join(options.root, options.src));
    fs.writeFileSync(path.join(options.root, 'package.json'), JSON.stringify(packageJson, null, 2));
    fs.writeFileSync(path.join(options.root, '.eslintrc'), JSON.stringify(eslintRc, null, 2));
    fs.writeFileSync(path.join(options.root, options.src, 'pack.json'), JSON.stringify(packJson, null, 2));
    fs.writeFileSync(
      path.join(options.root, options.src, `${options.main}.test.js`),
      options.react ? testReactContent : testContent,
    );
    fs.writeFileSync(
      path.join(options.root, options.src, `${options.main}.js`),
      options.react ? mainReactContent : mainContent,
    );
    return true;
  }
  return false;
};
