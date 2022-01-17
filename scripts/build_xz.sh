#!/bin/bash

XZ_VERSION=5.2.5

cd /app/build
wget 'https://tukaani.org/xz/xz-5.2.5.tar.gz/download'
tar xvf download
cd xz-${XZ_VERSION}
mkdir -p build
cd build
CFLAGS="-fPIC" emconfigure ../configure --enable-shared=no --enable-static=yes --prefix=/tmp/xz
emmake make install

mkdir -p /app/build/Rlibs/lib
mkdir -p /app/build/Rlibs/include
cp src/liblzma/.libs/liblzma.a /app/build/Rlibs/lib/
cp -r /tmp/xz/include/* /app/build/Rlibs/include/
