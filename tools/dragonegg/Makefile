WEBR_ROOT = $(abspath ../..)
ROOT = $(abspath .)

BUILD = $(ROOT)/build
LIBGFORTRAN_BUILD = $(BUILD)/libgfortran
LIBGFORTRAN_SOURCE = $(ROOT)/libgfortran

HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm
TOOLS = $(WEBR_ROOT)/tools

DRAGONEGG_SOURCE = $(BUILD)/dragonegg
DRAGONEGG_LIB = $(DRAGONEGG_SOURCE)/dragonegg.so
LIBGFORTRAN_WASM_LIB = $(BUILD)/libgfortran/libgfortran.a

# Configure your local environment in this file
-include ~/.webr-config.mk

NPROC ?= 4


.PHONY: all
all: $(DRAGONEGG_LIB) $(LIBGFORTRAN_WASM_LIB)

$(DRAGONEGG_SOURCE):
	mkdir -p $(BUILD)
	cd $(BUILD) && git clone \
	  --single-branch \
	  --branch="release_33" \
	  --depth=1 \
	  https://github.com/llvm-mirror/dragonegg.git \
	  $(DRAGONEGG_SOURCE)

$(DRAGONEGG_LIB): $(DRAGONEGG_SOURCE)
	cd $(DRAGONEGG_SOURCE) && \
	  LLVM_CONFIG=llvm-config-3.3 \
	  GCC=gcc-4.6 \
	  CC=gcc-4.6 \
	  CXX=g++-4.6 \
	  $(MAKE) -j$(NPROC)

$(LIBGFORTRAN_WASM_LIB):
	mkdir -p $(LIBGFORTRAN_BUILD)
	( \
	  set -e; \
	  cd $(LIBGFORTRAN_BUILD); \
	  emcc -fPIC -std=gnu11 -g -Os -c $(LIBGFORTRAN_SOURCE)/pow_i4_i4.c -o pow_i4_i4.o; \
	  emcc -fPIC -std=gnu11 -g -Os -c $(LIBGFORTRAN_SOURCE)/string_intrinsics_inc.c -o string_intrinsics_inc.o; \
	  rm -f libgfortran.a; \
	  emar -cr libgfortran.a pow_i4_i4.o string_intrinsics_inc.o; \
	)

.PHONY: install
install:
	mkdir -p $(HOST)/lib $(WASM)/lib
	cp $(DRAGONEGG_LIB) $(HOST)/lib
	cp $(LIBGFORTRAN_WASM_LIB) $(WASM)/lib/
	sed -e "s|@LIB_PATH@|$(HOST)/lib|" emfc.in > emfc
	chmod +x emfc

.PHONY: clean
clean:
	rm -rf $(ROOT)/build
