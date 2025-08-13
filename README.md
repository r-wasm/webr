[![Build, test and deploy webR](https://github.com/r-wasm/webr/actions/workflows/deploy.yml/badge.svg)](https://github.com/r-wasm/webr/actions/workflows/deploy.yml) [![codecov](https://codecov.io/gh/r-wasm/webr/branch/main/graph/badge.svg)](https://codecov.io/gh/r-wasm/webr)

# WebR - R in the Browser
This project aims to compile the statistical language R (https://www.r-project.org/) into WebAssembly for use with a browser, via Emscripten (https://emscripten.org/). The repo includes patches to R's source code so that it can work in the browser environment provided by Emscripten and also includes a web-based IDE through the use of [xterm.js](https://xtermjs.org/) and [CodeMirror](https://codemirror.net/).

## Demo
A demo of the webR IDE can be found at https://webr.sh. Please be patient as the Wasm runtime downloads and executes. R will display a banner message when it is ready to use.

## Documentation
Documentation showing how to use webR in your own projects can be found at
https://docs.r-wasm.org/webr/latest/

## Downloading webR
The webR JavaScript package is available for download through [npm](https://www.npmjs.com/package/webr) and on [CDN](https://docs.r-wasm.org/webr/latest/downloading.html#download-from-cdn).

Complete release packages, including R WebAssembly binaries, are available to download for self hosting in the [GitHub Releases section](https://github.com/r-wasm/webr/releases).

Docker images containing a pre-built webR development environment can be found in the [GitHub Packages section](https://github.com/r-wasm/webr/pkgs/container/webr).

## Building webR from source
R's source code and supporting libraries are written in both C/C++ and Fortran. Source files can be compiled with either a [custom development version of LLVM flang](https://github.com/lionel-/f18-llvm-project/commits/fix-webr) (the default) or with `gfortran` and Dragonegg (using the `--with-dragonegg` configure option).

If you are compiling webR using the default toolchain, ensure that you first install the following required prerequisites in your build environment:
 * [Emscripten SDK](https://emscripten.org/docs/getting_started/downloads.html) (>=3.1.35)
 * cmake
 * gperf
 * liblzma
 * libpcre2
 * node (>=17.0.0)
 * quilt
 * wget

### Build instructions

Clone the repo into a new directory, `cd` into the directory, then run `./configure && make`. You can configure `make` variables in a `~/.webr-config.mk` file.

A `dist` directory is created which when finished contains the R Wasm files and an `index.html` file ready to serve the included webR IDE.

#### WebAssembly libraries

WebR relies on additional libraries compiled for Wasm for both Cairo graphics support and for building R packages that depend on certain system libraries. By default, only a minimal set of libraries are built for use with webR.

If you'd prefer to build all of the available system libraries for Wasm, `cd` into the `libs` directory and run `make all` to build the additional libraries, then finally `cd ..` and run `make clean-webr && make` to rebuild webR. R will automatically detect the additional Wasm libraries and integrate Cairo graphics support as part of the build.

### Building with Docker

Included in the source repository is a `Dockerfile` which can be used to setup everything that's required for the webR build environment, including LLVM flang and all supported WebAssembly system libraries.

Pre-built docker images can be found in the [GitHub Packages section](https://github.com/r-wasm/webr/pkgs/container/webr). To build the docker image and webR from source, `cd` into the webR source directory then run `docker build .`

The resulting docker image contains a version of R configured to be built for WebAssembly, and so the image can also be used to build custom R packages for webR.

### Building with Nix

If you are using Nix, you can start a development environment by running `nix develop`. Then you can build as usual, with `./configure && make`.

Note that this requires that your Nix installation has support for flakes enabled. The easiest way to do this is to install using the [Nix installer from Determinate Systems](https://zero-to-nix.com/start/install).

### Node and Emscripten versioning

WebR requires compiler and runtime support for [WebAssembly.Exception](https://developer.mozilla.org/en-US/docs/WebAssembly/JavaScript_interface/Exception), used internally for R error handling. This requires a version of Emscripten >= 3.1.35 and Node >= 17.0.0, which may be newer than the versions provided by your system package manager. An easy way to install and manage multiple versions of Node and Emscripten is by using [nvm](https://github.com/nvm-sh/nvm) and [emsdk](https://github.com/emscripten-core/emsdk).

The version of Node currently bundled by `emsdk` is 16.0.0. When building webR with this version of Node the process will fail with configure logs containing the error

```
WebAssembly.Tag is not a constructor
```

If this occurs, a newer version of Node should be installed and the following environment variable set before building webR, instructing Emscripten to use the newer version of Node:

```
export EM_NODE_JS=$(HOME)/.nvm/versions/node/v20.1.0/bin/node
```

If you are unsure of the correct path to Node the command `which node` should print the path in full.

### Building on macOS Ventura 13.0+

At the time of writing the version of R used as the base for webR does not build cleanly using the macOS Ventura development SDK. If you are not using the included `Dockerfile` to build webR, the following extra setup must be done before starting the build process,

 * Install the GNU version of the patch program: e.g. `brew install gpatch`

### Using Dragonegg (Optional)

If you intend to build webR using Dragonegg to handle Fortran sources, older versions of the `gcc`/`gfortran` toolchain are required than what is provided by modern operating system repositories. The docker file `tools/dragonegg/Dockerfile` can be used to setup the required C/C++/Fortran toolchain and development environment for compiling webR with Dragonegg.
