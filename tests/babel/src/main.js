/* eslint-disable no-console */
/* global fetch, window */


// supports generators and ultimately async / await (ES8)
const getRepos = async () => {
  const response = await fetch('https://api.github.com/users/fruuf/repos');
  const data = await response.json();
  return data;
};
getRepos().then(repos => console.log({ repos }));


// supports object rest spread
const object = {
  a: 1,
  b: 2,
  c: 3,
};

const { a, ...rest } = object;
console.log({ a, rest });


// supports legacy decorators and
const decorator = () => (target, property, descriptor) => descriptor;

class Greeting {
  prefix = 'hello';

  static seperator = ' - ';

  @decorator()
  sayHello(message) {
    return [this.prefix, message].join(Greeting.seperator);
  }

  boundFunc = () => this.prefix

  unboundFunc() {
    return this.prefix;
  }
}

const greeting = new Greeting();
console.log(greeting.sayHello('foo'));
console.log('bound', greeting.boundFunc());
// we use setTimeout to loose context
window.setTimeout(() => {
  console.log('unbound', ::greeting.unboundFunc());
}, 0);
