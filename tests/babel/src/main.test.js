/* eslint-disable no-console */
/* global window */
import { getRepos, getRest, Greeting } from './util';

describe('babel', () => {
  it('fetches repos', async () => {
    const repos = await getRepos();
    expect(repos).to.be.an('array');
  });
  it('supports the object rest', () => {
    const rest = getRest({ a: 1, b: 2, c: 3 });
    expect(rest.a).to.equal(undefined);
    expect(rest.b).to.equal(2);
    expect(rest.c).to.equal(3);
  });
  it('exports class binding', () => {
    const greeting = new Greeting();
    expect(greeting.sayHello('foo')).to.equal('hello - foo');
    expect(greeting.boundFunc()).to.equal('hello');
    expect(::greeting.unboundFunc()).to.equal('hello');
  });
});
