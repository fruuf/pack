/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';
import denodeify from 'denodeify';
import childProcess from 'child_process';
import rimraf from 'rimraf';
import chai from 'chai';
import chaiThings from 'chai-things';
import glob from 'glob';
import fs from 'fs';

chai.use(chaiThings);

global.expect = chai.expect;

const rm = denodeify(rimraf);
const tempDir = path.join(__dirname, '..', '.tmp');
const packExecutable = path.join(__dirname, '..', '.bin', 'pack');
const exec = denodeify(childProcess.exec, (err, stdout, stderr) => ([err, [stdout, stderr]]));
const pack = async (cwd, args) => {
  await rm(tempDir);
  const relativeDir = path.relative(cwd, tempDir);
  const result = await exec(`${packExecutable} ${args} -d ${relativeDir}`, { cwd });
  if (result[1]) throw new Error(result[1]);
  return globPattern => new Promise((resolve, reject) => {
    glob(globPattern, {
      cwd: tempDir,
      root: tempDir,
    }, (err, files) => {
      if (err) {
        reject(err);
      } else {
        resolve(
          files.map(name => ({
            name, content: fs.readFileSync(path.join(tempDir, name), { encoding: 'utf8' }),
          })),
        );
      }
    });
  });
};
const packTest = (cwd, args) => denodeify(
  childProcess.exec,
  (err, stdout, stderr) => ([null, !(err || stderr)]),
)(`${packExecutable} ${args} -t`, { cwd });
global.pack = pack;
global.packTest = packTest;
