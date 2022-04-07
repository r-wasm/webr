#!/bin/bash
set -e

build_pcre.sh
build_xz.sh
build_libgfortran.sh

R_VERSION=4.1.3

cd /app/build

# Ensure script is idempotent
rm -rf "R-${R_VERSION}"
rm -rf "/tmp/R-${R_VERSION}"
rm -rf "/tmp/webR-${R_VERSION}"
rm -f "R-${R_VERSION}.tar.gz"

# Download R
wget "https://cran.r-project.org/src/base/R-4/R-${R_VERSION}.tar.gz"
tar xvf "R-${R_VERSION}.tar.gz"
cd "R-${R_VERSION}"

# Apply patch series
cp -r "/app/patches/R-${R_VERSION}/." "patches"
quilt push -a

# Workaround for the lack of LaTeX packages
pushd doc
touch NEWS NEWS.pdf NEWS.rds NEWS.2.rds NEWS.3.rds
popd

# Stage 1: Build a native version of R so we can compile the default packages
FC=gfortran-4.6 CXX=clang++ CC=clang ./configure --prefix="/tmp/R-${R_VERSION}" \
--with-x=no --with-readline=no --with-jpeglib=no --with-cairo=no --disable-openmp \
--with-recommended-packages=no --enable-R-profiling=no --with-pcre2 --disable-nls \
--enable-byte-compiled-packages=no --enable-long-double=no
make R
make install
make clean

# Stage 2: Reconfigure and build for wasm32-unknown-emscripten target
MAIN_LDFLAGS="-s WASM_BIGINT -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MAIN_MODULE=1 -s FETCH=1 -s NO_EXIT_RUNTIME=0 -s ERROR_ON_UNDEFINED_SYMBOLS=0" \
SHLIB_LDFLAGS="-s SIDE_MODULE=1 -s WASM_BIGINT" \
CPPFLAGS="-s USE_BZIP2=1 -s USE_ZLIB=1 -s USE_LIBPNG=1 -Oz -fPIC -I/app/build/Rlibs/include -DEXPEL_OLD_TO_NEW=1" \
CFLAGS="-s USE_BZIP2=1 -s USE_ZLIB=1 -s USE_LIBPNG=1 -Oz -fPIC -I/app/build/Rlibs/include -DEXPEL_OLD_TO_NEW=1" \
LDFLAGS="-L/app/build/Rlibs/lib" FPICFLAGS="-fPIC" FC=emfc \
emconfigure ./configure --prefix="/tmp/webR-${R_VERSION}"  --with-x=no \
--with-readline=no --with-jpeglib=no --with-cairo=no --disable-openmp \
--with-recommended-packages=no --enable-R-profiling=no --with-pcre2 --disable-nls \
--enable-byte-compiled-packages=no --enable-static=yes --host=wasm32-unknown-emscripten

# Remove lazy loaded base package so that R can cleanly rebuild
rm "/tmp/R-${R_VERSION}/lib/R/library/base/R/base"*
pushd src/library/base
make R_EXE="/tmp/R-${R_VERSION}/bin/R --vanilla --no-echo" Rsimple
popd
cp -r library/base/R/. "/tmp/R-${R_VERSION}/lib/R/library/base/R"

# Build R for wasm32-unknown-emscripten
make R_EXE="/tmp/R-${R_VERSION}/bin/R --vanilla --no-echo" R

# Install lazy loaded packages by copying back into the build tree
cp -r "/tmp/R-${R_VERSION}/lib/R/library/base/R/base"* library/base/R/
cp -r "/tmp/R-${R_VERSION}/lib/R/library/methods/R/methods"* library/methods/R/
make R_EXE="/tmp/R-${R_VERSION}/bin/R --vanilla --no-echo" install-wasm


# Rebuild R.bin.js and R.bin.data
make R_EXE="/tmp/R-${R_VERSION}/bin/R --vanilla --no-echo" R
make R_EXE="/tmp/R-${R_VERSION}/bin/R --vanilla --no-echo" install-wasm

cp -r "/tmp/webR-${R_VERSION}/dist/." /app/webR/
