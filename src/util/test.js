import jsdom from 'jsdom-global';
import chai, { expect } from 'chai';
import chaiEnzyme from 'chai-enzyme';
import register from 'babel-register';
import { mount } from 'enzyme';
import 'ignore-styles';

export default (options) => {
  global.expect = expect;
  register({
    ignore: /node_modules/,
    babelrc: false,
    presets: [
      require.resolve('babel-preset-react'),
      require.resolve('babel-preset-es2015'),
      require.resolve('babel-preset-es2016'),
      require.resolve('babel-preset-es2017'),
    ],
    plugins: [
      require.resolve('babel-plugin-transform-runtime'),
      require.resolve('babel-plugin-transform-es2015-destructuring'),
      require.resolve('babel-plugin-transform-object-rest-spread'),
      [require.resolve('babel-root-slash-import'), { rootPathSuffix: options.src }],
    ],
  });

  if (options.react) {
    global.mount = mount;
    chai.use(chaiEnzyme());
    jsdom();
  }
};
