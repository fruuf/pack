/* eslint-disable import/no-extraneous-dependencies */
import path from 'path';
import denodeify from 'denodeify';
import childProcess from 'child_process';
import rimraf from 'rimraf';
import jsonfile from 'jsonfile';
import { expect } from 'chai';

global.expect = expect;

const rm = denodeify(rimraf);
const tempDir = path.join(__dirname, '..', '.tmp');
const packExecutable = path.join(__dirname, '..', '.bin', 'pack');
const exec = denodeify(childProcess.exec, (err, stdout, stderr) => ([err, [stdout, stderr]]));
const pack = async (cwd, args) => {
  await rm(tempDir);
  const relativeDir = path.relative(cwd, tempDir);
  const result = await exec(`${packExecutable} ${args} -d ${relativeDir}`, { cwd });
  if (result[1]) throw new Error(result[1]);
  const stats = jsonfile.readFileSync(path.join(tempDir, 'stats.json'));
  return stats;
};
global.pack = pack;
