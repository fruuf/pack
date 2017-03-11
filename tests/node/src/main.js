import glob from 'glob';

glob('*.js', (err, files) => {
  // eslint-disable-next-line no-console
  console.log(files);
});

const buildTarget = () => {};

if (process.env.BUILD_TARGET === 'browser') {
  buildTarget('BUILD_TARGET_BROWSER');
}

if (process.env.BUILD_TARGET === 'node') {
  buildTarget('BUILD_TARGET_NODE');
}
