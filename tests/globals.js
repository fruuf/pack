/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';
import denodeify from 'denodeify';
import childProcess from 'child_process';
import rimraf from 'rimraf';
import recursiveCopy from 'recursive-copy';
import chai from 'chai';
import chaiThings from 'chai-things';
import glob from 'glob';
import fs from 'fs';

chai.use(chaiThings);

global.expect = chai.expect;

const rm = denodeify(rimraf);
const cp = denodeify(recursiveCopy);
const tempDir = path.join(__dirname, '..', '.tmp');
const packExecutable = path.join(__dirname, '..', '.bin', 'pack');
const exec = denodeify(childProcess.exec, (err, stdout, stderr) => [err, [stdout, stderr]]);

const defaultOptions = {
  copy: true,
  root: 'dist',
};

const pack = async (cwd, args, options = {}) => {
  const opt = Object.assign({}, defaultOptions, options);
  await rm(tempDir);
  fs.mkdirSync(tempDir);
  if (opt.copy) await cp(cwd, tempDir);
  const result = await exec(`${packExecutable} ${args}`, { cwd: tempDir });
  // eslint-disable-next-line no-console
  if (result[1]) console.warn(result[1]);


  return globPattern => new Promise((resolve, reject) => {
    glob(
      globPattern,
      {
        cwd: path.join(tempDir, opt.root),
        root: path.join(tempDir, opt.root),
      },
      (err, files) => {
        if (err) {
          reject(err);
        } else {
          resolve(
            files.map(name => ({
              name,
              content: fs.readFileSync(path.join(tempDir, opt.root, name), { encoding: 'utf8' }),
            })),
          );
        }
      },
    );
  });
};

const packTest = (cwd, args) =>
  denodeify(childProcess.exec, (err, stdout, stderr) => [
    null,
    !(err || stderr),
  ])(`${packExecutable} ${args} -t`, { cwd });

global.pack = pack;
global.packTest = packTest;
