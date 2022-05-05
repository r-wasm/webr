# WebR - R in the Browser

This project aims to compile the statistical language R (https://www.r-project.org/) into WASM for use with a browser, via Emscripten (https://emscripten.org/).

Included in the repo is a `Dockerfile` which is used to setup an environment and toolchain for compiling R's source code and
supporting libraries, written in both C and Fortran. The toolchain makes use of specific versions of Emscripten and LLVM. Fortran files can be compiled with either a [custom development version of flang](https://github.com/lionel-/f18-llvm-project/commits/fix-webr) (the default) or with gfortran
and Dragonegg (using the `--with-dragonegg` configure option).

The repo includes patches for R's source code so that it can work in the browser environment provided
by Emscripten. The patches also tweak R's interactive mode so as to provide a web-based REPL through the use of [jQuery Terminal](https://terminal.jcubic.pl/) and [jcubic's Emscripten POC](https://gist.github.com/jcubic/87f2b4c5ef567be43796e179ca08c0da).

## Instructions

Clone the repo into a new directory, `cd` into the directory, then run `./configure && make`. You can configure `make` variables in a `~/.webr-config.mk` file.

A `dist` directory is created which when finished contains the R WASM files
and an `index.html` file ready to serve an R REPL.

## Demo

A demo of the resulting R REPL can be found at https://www.mas.ncl.ac.uk/~ngs54/webR/

Loading the page will initally result in a black screen. Please be patient as the WASM runtime downloads and executes. R will display a banner message when it is ready to use.
