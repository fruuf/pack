/* eslint-disable prefer-arrow-callback */
/* global document, window */

const React = require('react');
const render = require('react-dom').render;
// eslint-disable-next-line
const App = require('main').default;

const renderTarget = document.getElementById('render') || document.createElement('div');
if (!document.body.contains(renderTarget)) {
  document.body.appendChild(renderTarget);
}

if (process.env.NODE_ENV === 'production') {
  render(React.createElement(App, null), renderTarget);
} else {
  // eslint-disable-next-line global-require
  const AppContainer = require('react-hot-loader').AppContainer;

  render(
    React.createElement(
      AppContainer,
      null,
      React.createElement(App, null)
    ),
    renderTarget
  );

  if (module.hot) {
    module.hot.accept('main', function acceptUi() {
      // eslint-disable-next-line 
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
}
