/* global document */
const React = require('react');
const { render } = require('react-dom');
const { AppContainer } = require('react-hot-loader');

// eslint-disable-next-line global-require
const App = require('main').default;
let renderTarget = document.getElementById('render');

if (!renderTarget) {
  renderTarget = document.createElement('div');
  document.body.appendChild(renderTarget);
}

window.onload = () => {
  render(
    React.createElement(
      AppContainer,
      null,
      React.createElement(App, null)
    ),
    renderTarget
  );
};

if (module.hot) {
  module.hot.accept('main', () => {
    // eslint-disable-next-line global-require
    const NewApp = require('main').default;
    render(
      React.createElement(
        AppContainer,
        null,
        React.createElement(NewApp, null)
      ),
      renderTarget
    );
  });
}
