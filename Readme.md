# features
- imports and compiles images, fonts, svgs, react, sass
- development server with hot reload and component hot reload
- builds optimised production bundle with assets

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
        "build": "pack"
      }
    }

# folder structure
## normal
    - src
      - main.js

## react
    - src
      - components
        - App
          - index.js
          - style.scss
      - main.js


# options
`-w`, `--watch` [false]
enable watch mode and start development server with hot reload on localhost:port

`-r`, `--react` [false]
enable react mode
expect entry file (src/main) to export component on default
enables component hot reload
mounts the component into #render (or empty div)

`-p`, `--port` [8080]
port number for dev server (ignored in non-watch mode)

`-o`, `--output` ['dist']
output directory relative to working directory for production bundles (ignored in watch mode)

`-c`, `--components` ['components']
react component directory relative to source
a component Component.js in that directory can be imported from 'Component'

`-s`, `--source` ['src']
source directory relative to working directory

`-a`, `--assets` ['/']
assets url relative to hostname

`-b`, `--bundle` ['bundle']
bundle name (bundle.js and bundle.css)

`-m`, `--main` ['main']
entry point file name
