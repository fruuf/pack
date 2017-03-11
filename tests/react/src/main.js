import config from './config.yaml';
import './main.global.scss';

// eslint-disable-next-line no-console
console.log(config);

export { default } from './components/App';

const buildTarget = () => {};

if (process.env.BUILD_TARGET === 'browser') {
  buildTarget('BUILD_TARGET_BROWSER');
}

if (process.env.BUILD_TARGET === 'node') {
  buildTarget('BUILD_TARGET_NODE');
}
