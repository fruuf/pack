/* global document, window */
import React from 'react';
import { render } from 'react-dom';
// eslint-disable-next-line
import App from 'main'; // main is aliased in webpack config as the entry point

// find element with id render or create an empty div
const renderTarget = document.getElementById('render') || document.createElement('div');
// append renderTarget to the body if necccessary
if (!document.body.contains(renderTarget)) {
  document.body.appendChild(renderTarget);
}

// allow hot reloading to be eliminated by dead code elimination
if (process.env.NODE_ENV === 'production') {
  render(React.createElement(App, null), renderTarget);
} else {
  // eslint-disable-next-line global-require
  const AppContainer = require('react-hot-loader').AppContainer;

  // wrap the entry point into AppContainer and render
  render(
    React.createElement(
      AppContainer,
      null,
      React.createElement(App, null),
    ),
    renderTarget,
  );

  // accept updates from the entry point and re-render app
  if (module.hot) {
    module.hot.accept('main', () => {
      // eslint-disable-next-line
      const NewApp = require('main').default;

      render(
        React.createElement(
          AppContainer,
          null,
          React.createElement(NewApp, null),
        ),
        renderTarget,
      );
    });
  }
}
