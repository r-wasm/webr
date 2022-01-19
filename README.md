# WebR - R in the Browser

This project aims to compile the statistical language R[^1] into WASM for use in a browser, via Emscripten[^2].

Included in the repo is a `Dockerfile` and some scripts that setup a toolchain for compiling R's C and Fortran
source code using Emscripten, LLVM, gfortran and dragonegg. Further information about the toolchain can be
found at [^3].

The repo also provides patches for R-4.1.2's source code to allow it to work in the WASM environment provided
by the browser and Emscripten. R's interactive REPL is tweaked so that a web-based REPL is be provided based on
use of jQuery Terminal [^4] and the POC at [^5].

## Instructions

Clone the repo into a new directory, `cd` into the directory, then run `make`.
A `build` directory is created and when finished contains the R WASM binaries
and an `index.html` file setup to present an R REPL.

[^1]: https://www.r-project.org/
[^2]: https://emscripten.org/
[^3]: https://chrz.de/2020/04/21/fortran-in-the-browser/
[^4]: https://terminal.jcubic.pl/
[^5]: https://gist.github.com/jcubic/87f2b4c5ef567be43796e179ca08c0da
