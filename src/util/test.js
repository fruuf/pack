import jsdom from 'jsdom-global';
import chai, { expect } from 'chai';
import chaiEnzyme from 'chai-enzyme';
import chaiPromise from 'chai-as-promised';
import register from 'babel-register';
import { mount } from 'enzyme';
import 'ignore-styles';
import { babelPlugins, getEnvironment } from './helper';

export default async (options) => {
  // merge environment variables into process.env
  const environment = await getEnvironment(options);
  process.env = Object.assign(process.env, environment);

  // provide global expect function
  global.expect = expect;

  // allow tests to be written in modern js with the same babel settings
  register(
    babelPlugins(options, {
      ignore: /node_modules/,
    }),
  );

  // chai addon for promoises
  chai.use(chaiPromise);

  // provide global mount function for enzyme in react test mode
  if (options.react) {
    global.mount = mount;
    chai.use(chaiEnzyme());
    jsdom();
  }
};
