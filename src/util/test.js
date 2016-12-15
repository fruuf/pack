import jsdom from 'jsdom-global';
import chai, { expect } from 'chai';
import chaiEnzyme from 'chai-enzyme';
import chaiPromise from 'chai-as-promised';
import register from 'babel-register';
import { mount } from 'enzyme';
import 'ignore-styles';
import { babelPlugins } from './util';

export default (options) => {
  global.expect = expect;
  register(babelPlugins(options, {
    ignore: /node_modules/,
  }));

  chai.use(chaiPromise);

  if (options.react) {
    global.mount = mount;
    chai.use(chaiEnzyme());
    jsdom();
  }
};
