# pack-cli
bundle and test client and server side javascript with webpack and mocha without configuration
- compiles JavaScript (React + ES2017), CoffeeScript, Jade, Pug, JSON and yaml
- bundles sass, less and css with optional css, images, fonts, videos
- development with (react) hot reloading
- minified production builds
- unit tests with mocha, enzyme and ES2017
- browser (ES5 + css prefixes) and nodeJS as build targets

# get started
## install
    npm install pack-cli --save
    yarn add pack-cli

## add package scripts in package.json

    {
      "scripts": {
        "start": "pack -w",
        "build": "pack",
        "test": "pack -t",
        "help": "pack -h"
      }
    }

# folder structure
    - src
      - main.js
