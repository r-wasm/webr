#!/bin/bash
set -e

cd /app
git clone --single-branch --branch="releases/gcc-4.6" --depth=1 https://github.com/gcc-mirror/gcc.git

cd /app/build
mkdir -p libgfortran-4.6
cd libgfortran-4.6
cp /app/gcc/libgfortran/generated/pow_i4_i4.c .
cp /app/gcc/libgfortran/intrinsics/string_intrinsics_inc.c .
echo '#include "libgfortran.h"' | cat - string_intrinsics_inc.c > string_intrinsics_inc.tmp && mv string_intrinsics_inc.tmp string_intrinsics_inc.c

cat << EOF > libgfortran.h
#define HAVE_GFC_INTEGER_4
#define GFC_INTEGER_4 int
#define GFC_UINTEGER_4 unsigned int
#define GFC_LOGICAL_4 unsigned int
#define gfc_charlen_type int
#define CHARTYPE char
#define UCHARTYPE unsigned char
#define PREFIX(x) 
#define SUFFIX(x) x
#define MEMCMP memcpy
#define MEMSET memset
#define internal_malloc_size malloc
#define sym_rename(old, new) extern __typeof(old) old __asm__(#new)
#define export_proto(x) sym_rename(x, _gfortran_ ## x)
#define iexport(x) extern __typeof(x) _gfortran_ ## x __attribute__((__alias__(#x)))
#define runtime_error(...) fprintf (stderr, __VA_ARGS__)
#include <stdarg.h>
#include <string.h>
#include <assert.h>
#include <stdlib.h>
#include <stdio.h>
EOF

emcc -fPIC -std=gnu11 -g -Os -c pow_i4_i4.c -o pow_i4_i4.o
emcc -fPIC -std=gnu11 -g -Os -c string_intrinsics_inc.c -o string_intrinsics_inc.o
emar -cr libgfortran.a pow_i4_i4.o string_intrinsics_inc.o

cp libgfortran.a /app/build/Rlibs/lib/
