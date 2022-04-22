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
