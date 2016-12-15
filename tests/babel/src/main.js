/* eslint-disable no-console */
/* global window */
import { getRepos, getRest, Greeting } from './util';

getRepos().then(repos => console.log({ repos }));

const rest = getRest({ a: 1, b: 2, c: 3 });
console.log({ rest });

const greeting = new Greeting();
console.log(greeting.sayHello('foo'));
console.log('bound', greeting.boundFunc());
// we use setTimeout to loose context
window.setTimeout(() => {
  console.log('unbound', ::greeting.unboundFunc());
}, 0);
