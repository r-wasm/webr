[![Build, test and deploy webR](https://github.com/r-wasm/webr/actions/workflows/deploy.yml/badge.svg)](https://github.com/r-wasm/webr/actions/workflows/deploy.yml) [![codecov](https://codecov.io/gh/r-wasm/webr/branch/main/graph/badge.svg)](https://codecov.io/gh/r-wasm/webr)

# WebR - R in the Browser

This project aims to compile the statistical language R (https://www.r-project.org/) into WASM for
use with a browser, via Emscripten (https://emscripten.org/).

## Documentation

Documentation showing how to use webR in your own projects can be found at
https://docs.r-wasm.org/webr/latest/

## Downloading webR

The webR JavaScript package is available for download through [npm](https://www.npmjs.com/package/@r-wasm/webr) and on [CDN](https://docs.r-wasm.org/webr/latest/downloading.html#download-from-cdn).

Complete release packages, including R WebAssembly binaries, are available to download for self hosting in the [GitHub Releases section](https://github.com/r-wasm/webr/releases).

## Building webR from Source
Included in the source repository is a `Dockerfile` which can be optionally used to setup an
environment and toolchain for compiling R's source code and supporting libraries, written in
both C and Fortran. If you are compiling webR without Docker, ensure that you first have the
[Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) installed, along
with some required prerequisites:
 * cmake
 * wget
 * quilt
 * liblzma
 * libpcre2
 * node (>=16.0.0)

R's Fortran source files can be compiled with either a
[custom development version of flang](https://github.com/lionel-/f18-llvm-project/commits/fix-webr)
(the default) or with gfortran and Dragonegg (using the `--with-dragonegg` configure option).

The repo includes patches for R's source code so that it can work in the browser environment
provided by Emscripten. The patches also tweak R's interactive mode so as to provide a web-based
REPL through the use of [xterm.js](https://xtermjs.org/).

### Build Instructions

Clone the repo into a new directory, `cd` into the directory, then run `./configure && make`.
You can configure `make` variables in a `~/.webr-config.mk` file.

A `dist` directory is created which when finished contains the R WASM files
and an `index.html` file ready to serve an R REPL.

### Building on macOS Ventura 13.0+

At the time of writing the version of R used as the base for webR does not build cleanly using
the macOS Ventura development SDK. If you are not using the included `Dockerfile` to build webR,
the following extra setup must be done before starting the build process,

 * Install the GNU version of the patch program: e.g. `brew install gpatch`

## Demo

A demo of the resulting R REPL can be found at https://webr.r-wasm.org/latest/

Please be patient as the WASM runtime downloads and executes. R will display a
banner message when it is ready to use.
