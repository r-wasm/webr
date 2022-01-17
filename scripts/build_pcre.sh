#!/bin/bash

PCRE_VERSION=10.39

cd /app/build
wget "https://github.com/PhilipHazel/pcre2/releases/download/pcre2-${PCRE_VERSION}/pcre2-${PCRE_VERSION}.tar.gz"
tar xvf pcre2-${PCRE_VERSION}.tar.gz
cd pcre2-${PCRE_VERSION}
mkdir -p build
cd build
CFLAGS="-fPIC" emconfigure ../configure --enable-shared=no --enable-static=yes --prefix=/tmp/pcre/
emmake make install
cd src
emar -cr libpcre2_8.a libpcre2_8_la*.o

mkdir -p /app/build/Rlibs/lib
mkdir -p /app/build/Rlibs/include
cp libpcre2_8.a /app/build/Rlibs/lib/
cp -r /tmp/pcre/include/* /app/build/Rlibs/include/
