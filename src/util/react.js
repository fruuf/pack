/* global document, window */
import React from 'react';
import { render } from 'react-dom';
import Component from './app-container';

// find element with id render or create an empty div
const renderTarget = document.getElementById('render') || document.createElement('div');
// append renderTarget to the body if necccessary
if (!document.body.contains(renderTarget)) {
  document.body.appendChild(renderTarget);
}

render(<Component />, renderTarget);

// accept updates from the entry point and re-render app
if (module.hot) {
  module.hot.accept('./app-container', () => {
    // eslint-disable-next-line
    const NewComponent = require('./app-container').default;
    render(<NewComponent />, renderTarget);
  });
}
