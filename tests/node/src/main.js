import glob from 'glob';

glob('*.js', (err, files) => {
  // eslint-disable-next-line no-console
  console.log(files);
});
