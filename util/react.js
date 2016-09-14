/* eslint-disable prefer-arrow-callback */
/* global document, window */

const React = require('react');
const render = require('react-dom').render;
const AppContainer = require('react-hot-loader').AppContainer;

// eslint-disable-next-line global-require
const App = require('main').default;
const renderTarget = document.getElementById('render') || document.createElement('div');
if (!document.body.contains(renderTarget)) {
  document.body.appendChild(renderTarget);
}

window.onload = function () {
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
  module.hot.accept('main', function () {
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
