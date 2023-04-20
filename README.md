[![Build, test and deploy webR](https://github.com/r-wasm/webr/actions/workflows/deploy.yml/badge.svg)](https://github.com/r-wasm/webr/actions/workflows/deploy.yml) [![codecov](https://codecov.io/gh/r-wasm/webr/branch/main/graph/badge.svg)](https://codecov.io/gh/r-wasm/webr)

# WebR - R in the Browser
This project aims to compile the statistical language R (https://www.r-project.org/) into WebAssembly for use with a browser, via Emscripten (https://emscripten.org/). The repo includes patches to R's source code so that it can work in the browser environment provided by Emscripten and also includes a web-based REPL through the use of [xterm.js](https://xtermjs.org/).

## Demo
A demo of the resulting R REPL can be found at https://webr.r-wasm.org/latest/. Please be patient as the Wasm runtime downloads and executes. R will display a banner message when it is ready to use.

## Documentation
Documentation showing how to use webR in your own projects can be found at
https://docs.r-wasm.org/webr/latest/

## Downloading webR
The webR JavaScript package is available for download through [npm](https://www.npmjs.com/package/@r-wasm/webr) and on [CDN](https://docs.r-wasm.org/webr/latest/downloading.html#download-from-cdn).

Complete release packages, including R WebAssembly binaries, are available to download for self hosting in the [GitHub Releases section](https://github.com/r-wasm/webr/releases).

## Building webR from source
R's source code and supporting libraries are written in both C/C++ and Fortran. Source files can be compiled with either a [custom development version of LLVM flang](https://github.com/lionel-/f18-llvm-project/commits/fix-webr) (the default) or with gfortran and Dragonegg (using the `--with-dragonegg` configure option).

If you are compiling webR using the default toolchain, ensure that you first install the following required prerequisites:
 * [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (>=3.1.25)
 * cmake
 * liblzma
 * libpcre2
 * node (>=16.0.0)
 * quilt
 * wget

If you are compiling webR using Dragonegg, included in the source repository is a `Dockerfile` which can be used to setup the environment and Dragonegg toolchain.

### Build instructions

Clone the repo into a new directory, `cd` into the directory, then run `./configure && make`. You can configure `make` variables in a `~/.webr-config.mk` file.

A `dist` directory is created which when finished contains the R Wasm files and an `index.html` file ready to serve the included R REPL app.

### Building on macOS Ventura 13.0+

At the time of writing the version of R used as the base for webR does not build cleanly using the macOS Ventura development SDK. If you are not using the included `Dockerfile` to build webR, the following extra setup must be done before starting the build process,

 * Install the GNU version of the patch program: e.g. `brew install gpatch`
