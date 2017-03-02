import React from 'react';
import closeImage from './close.png';

export default () => (
  <div className="message">
    Hello World
    <img src={closeImage} alt="close" />
  </div>
);
