# pack-cli
[![CircleCI](https://circleci.com/gh/fruuf/pack.svg?style=svg)](https://circleci.com/gh/fruuf/pack)

bundle and test client and server side javascript with webpack and mocha without configuration
- compiles JavaScript (React + ES2017), CoffeeScript, Jade, Pug, JSON and yaml
- bundles sass, less and css with optional css-modules, images, fonts, videos
- development with (react) hot reloading
- minified production bundles
- unit tests with mocha, enzyme and ES2017
- browser (ES5 + css prefixes) and nodeJS as build targets

# quick start
    npm install -g pack-cli
    echo "import React from 'react';\n\nexport default () => (<h1>hello world</h1>);" > example.js
    pack -rwq example.js

runs a simple react example in watch mode on `http://localhost:8080`.
to create a minified bundle for production simply remove the watch flag (`pack -rq example.js`).
`-r` enables react mode, which mounts the exported component from the entry point and updates it on changes in watch mode.
`-q [filename]` enables the quick mode which is more like a sandbox mode for quick experiments.
it creates an additional `index.html` file next to the `bundle.js` on build.
the content of the `dist` folder can be served by any static web server.
on a real project pack-cli should be installed as a dependency and used without quick mode.

# build a real project
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
      - ( pack.json )
    - package.json

the entry point to the application is `src/main.js` and the root folder `src`.
these can be changed to `client/app.js` by passing `-s client` (`--src client`) and `-m app` (`--main app`) to the command line.

within the project files can be imported using relative paths (`./filename`) or absolute paths (`/filename`). absolute paths get resolved relative within the source directory `src`. this is useful for config files (`/config` rather than `../../config`).

to keep the scripts in the `package.json` simple, all options can be provided by an additional `pack.json` file in the source directory.
run `pack -h` to get a list of all possible options.

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
to prevent a stylesheet from being parsed prepend `global` to its extension (`import './legacy.css';` to `import './legacy.global.css';`).

# nodeJS
pass `-n` (`--node`) to build a node app.

# global install and help
the package can be installed global by using `npm install -g pack-cli`.
use `pack -h` to show all available options.
