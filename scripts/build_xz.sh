#!/bin/bash
set -e

XZ_VERSION=5.2.5

cd /app/build
[ -f /app/build/Rlibs/lib/liblzma.a ] && exit

wget 'https://tukaani.org/xz/xz-5.2.5.tar.gz/download'
tar xvf download
cd xz-${XZ_VERSION}
mkdir -p build
cd build
CFLAGS="-fPIC -Oz" emconfigure ../configure --enable-shared=yes --enable-static=yes --prefix=/app/build/Rlibs
emmake make install

# Remove symlinks to avoid overriding native system libraries
cd /app/build/Rlibs/lib/
rm liblzma.so liblzma.so.5
