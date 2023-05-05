include ${WASM_TOOLS}/fortran.mk
-include ~/.webr-vars.mk

WEBR_ROOT = $(abspath ..)
WASM_OPT ?= -Oz
WEBR_HOST_INCLUDES = -I$(R_SOURCE)/build-stage1/include -I$(R_SOURCE)/src/include
WEBR_LDFLAGS = -L$(WEBR_ROOT)/wasm/lib

EM_CXX_FIXES = -DRCPP_DEMANGLER_ENABLED=0 -D__STRICT_ANSI__
EM_CFLAGS = $(WEBR_HOST_INCLUDES) $(WASM_OPT)

CXX98 = em++
CXX11 = em++
CXX14 = em++
CXX17 = em++
CXX20 = em++
CC = emcc
CXX = em++
CFLAGS = -std=gnu11 $(EM_CFLAGS)
CXXFLAGS = -std=gnu++11 $(EM_CXX_FIXES) $(EM_CFLAGS)
CXX98FLAGS = -std=gnu++98 $(EM_CXX_FIXES) $(EM_CFLAGS)
CXX11FLAGS = -std=gnu++11 $(EM_CXX_FIXES) $(EM_CFLAGS)
CXX14FLAGS = -std=gnu++14 $(EM_CXX_FIXES) $(EM_CFLAGS)
CXX17FLAGS = -std=gnu++17 $(EM_CXX_FIXES) $(EM_CFLAGS)
CXX20FLAGS = -std=gnu++20 $(EM_CXX_FIXES) $(EM_CFLAGS)
LDFLAGS = -s SIDE_MODULE=1 -s WASM_BIGINT -s ASSERTIONS=1 $(WEBR_LDFLAGS) $(WASM_OPT)
FC = emfc
FLIBS = $(FORTRAN_WASM_LDADD)
AR = emar
ALL_CPPFLAGS = -DNDEBUG $(PKG_CPPFLAGS) $(CLINK_CPPFLAGS) $(CPPFLAGS)

# Clear up flags from $(R_HOME)/etc/Makeconf
override DYLIB_LD = $(CC)
override DYLIB_LDFLAGS = $(CFLAGS)
override DYLIB_LINK = $(DYLIB_LD) $(DYLIB_LDFLAGS) $(LDFLAGS)

override SHLIB_LDFLAGS =
override SHLIB_LINK = $(SHLIB_LD) $(SHLIB_LDFLAGS) $(LDFLAGS)

override FOUNDATION_LIBS =
override LIBINTL =

override LIBR =
override ALL_LIBS = $(PKG_LIBS) $(SHLIB_LIBADD) $(LIBR) $(LIBINTL)
