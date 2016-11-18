# pack-cli
[![CircleCI](https://circleci.com/gh/fruuf/pack.svg?style=svg)](https://circleci.com/gh/fruuf/pack)

bundle and test client and server side javascript with webpack and mocha without configuration
- compiles JavaScript (React + ES2017), CoffeeScript, Jade, Pug, JSON and yaml
- bundles sass, less and css with optional css-modules, images, fonts, videos
- development with (react) hot reloading
- minified production bundles
- unit tests with mocha, enzyme and ES2017
- browser (ES5 + css prefixes) and nodeJS as build targets

# get started
## install
    npm install pack-cli --save

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
    - package.json

the entry point to the application is `src/main.js` and the root folder `src`.
these can be changed to `client/app.js` by passing `-s client` (`--src client`) and `-m app` (`--main app`) to the command line.

within the project files can be imported using relative paths (`./filename`) or absolute paths (`/filename`). absolute paths get resolved relative within the source directory `src`. this is useful for config files (`/config` rather than `../../config`).


the production bundle gets written into `dist/js/bundle.js` and other subfolders (`dist/images`, `dist/css`, `dist/fonts`, `dist/media`).
these defaults can be changed to `build/app.js` by passing `-d build` (`--dist build`) and `-b app` (`--bundle app`).
to flatten the bundle (no subfolders) use `--flatten`.

# Watch mode
to enable development mode pass `-w` (`--watch`). this enables a hot reloading environment in the browser.

# React
to build a react single page app react mode can be enabled by passing `-r` (`--react`) to the app.
the entry point to the app (`src/main.js`) is expected to export a react component as default.

the component gets mounted into a dom element with id `render`, if no element is found a new div element is created in body and the component gets mounted in there.

when used in watch mode `-w` the component gets hot reloaded as soon as a file is changed.
react-hot-loader is used to preserve state.

# css modules
css modules can be enabled by passing `-c` (`--cssmodules`) to the command line arguments.
css modules are used for `.css`, `.less`, `.scss` files.
to prevent a stylesheet from being parsed add `?global` to its filename (`import './legacy.css';` to `import './legacy.css?global'`).

# nodeJS
pass `-n` (`--node`) to build a node app.

# global install and help
the package can be installed global by using `npm install -g pack-cli`.
use `pack -h` to show all available options.
