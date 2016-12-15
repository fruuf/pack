/* global mount, expect */
import React from 'react';
import App from './App';
import Message from './Message';

describe('<App />', () => {
  // we are testing chai, enzyme and chai-enzyme
  const wrapper = mount(<App />);
  it('is present', () => {
    expect(wrapper).to.be.present();
  });

  it('contains the message', () => {
    expect(wrapper).to.contain(<Message />);
  });
});
