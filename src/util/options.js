export const DEFAULT_OPTIONS = {
  watch: false,
  react: false,
  lite: false,
  cssmodules: false,
  node: false,
  flatten: false,
  port: '8080',
  assets: '/assets/',
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
  quick: false,
  init: false,
  externals: {},
};

export const VALID_OPTIONS = {
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
  quick: true,
  init: true,
  externals: true,
};

export const VALID_FILE_OPTIONS = Object.assign({}, VALID_OPTIONS, {
  watch: false,
  test: false,
  watchwrite: false,
  quick: false,
  init: false,
});

export const VALID_CLI_OPTIONS = Object.assign({}, VALID_OPTIONS, {
  externals: false,
});
