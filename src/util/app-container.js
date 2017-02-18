// eslint-disable-next-line
import App from 'main'; // main is aliased in webpack config as the entry point
import React from 'react';
import { AppContainer } from 'react-hot-loader';

export default () => (
  <AppContainer>
    <App />
  </AppContainer>
);
