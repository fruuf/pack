# pack
- simple build process cli for JS projects (node and browser)
- babel (airbnb, react), webpack, sourcemaps and hot-reloading ready to go

## web
- imports and bundles scripts, stylesheets (sass), images, fonts, svgs and jsx
- development server with hot reload and component hot reload
- builds optimised production bundle with assets
- proxy to sit on top of existing server

## node
- full es6 support
- hot-reloading with source maps
- builds bundle for node v4 and above

# get started
## demo
    git checkout demo
    npm install
    npm start

## install
    npm install fruuf/pack --save

## add package links (package.json)

    {
      "scripts": {
        "start": "pack -w",
        "build": "pack",
        "help": "pack -h"
      }
    }

# folder structure
    - src
      - main.js

# react
enable react mode to mount `export default Component` from `src/main` into `#render` or an empty `div`.
enables component hot reload while preserving state. if a directory `src/components` exists, components can be imported as modules. (`import Component from 'Component';` resolves to `src/components/Component.js`).

## folder structure
    - src
      - components
        - App
          - index.js
          - style.scss
      - main.js

# options
    .version('0.1.3')
    .description('pack a bundle')
    .option('-n, --node', 'enable node mode', false)
    .option('-w, --watch', 'enable watch mode', false)
    .option('-r, --react', 'enable react', false)
    .option('-e, --env', 'load .env file', false)
    .option('-s --src [srcdir]', 'source directory [src]', 'src')
    .option('-o, --output [directory]', 'output directory [dist]', 'dist')
    .option('-a --assets [pubdir]', 'assets directory []', '')
    .option('-p, --port [port]', 'port number [8080]', 8080)
    .option('--bundle [bundle]', 'bundle name [bundle]', 'bundle')
    .option('--main [main]', 'main filename [main]', 'main')
    .option('--static [staticdir]', 'static folder for development server []', '')
    .option('--proxy [proxy]', 'proxy port or server []', '')
    .option('--components [compdir]', 'react component dir [components]', 'components')
