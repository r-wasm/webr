#!/bin/bash
set -e

PCRE_VERSION=10.39

cd /app/build
[ -f /app/build/Rlibs/lib/libpcre2-8.la ] && exit

wget "https://github.com/PhilipHazel/pcre2/releases/download/pcre2-${PCRE_VERSION}/pcre2-${PCRE_VERSION}.tar.gz"
tar xvf pcre2-${PCRE_VERSION}.tar.gz
cd pcre2-${PCRE_VERSION}
mkdir -p build
cd build
CFLAGS="-fPIC -Oz" emconfigure ../configure --enable-shared=yes --enable-static=yes --prefix=/app/build/Rlibs
sed -i '/bin_PROGRAMS =/d' Makefile
sed -i '/noinst_PROGRAMS =/d' Makefile
emmake make install

# Remove symlinks to avoid overriding native system libraries
cd /app/build/Rlibs/lib/
rm libpcre2-8.so libpcre2-8.so.0 libpcre2-posix.so libpcre2-posix.so.3
