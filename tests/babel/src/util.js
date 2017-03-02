/* global fetch, window */

// supports generators and ultimately async / await (ES8)
export const getRepos = async () => {
  const response = await Promise.resolve({
    json() {
      return [];
    },
  });
  const data = await response.json();
  return data;
};

// supports object rest spread
export const getRest = (map) => {
  // eslint-disable-next-line no-unused-vars
  const { a, ...rest } = map;
  return rest;
};

// supports legacy decorators and function bind
const decorator = () => (target, property, descriptor) => descriptor;

export class Greeting {
  prefix = 'hello';

  static seperator = ' - ';

  @decorator()
  sayHello(message) {
    return [this.prefix, message].join(Greeting.seperator);
  }

  boundFunc = () => this.prefix;

  unboundFunc() {
    return this.prefix;
  }
}
