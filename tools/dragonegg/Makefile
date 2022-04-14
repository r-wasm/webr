WEBR_ROOT = $(abspath ../..)
ROOT = $(abspath .)

HOST = $(WEBR_ROOT)/host

DRAGONEGG_SOURCE = $(ROOT)/build
DRAGONEGG_LIB = $(DRAGONEGG_SOURCE)/dragonegg.so

# Configure your local environment in this file
-include ~/.webr-config.mk

NPROC ?= 4


.PHONY: all
all: $(DRAGONEGG_LIB)

$(DRAGONEGG_LIB): $(DRAGONEGG_SOURCE)
	cd $(DRAGONEGG_SOURCE) && \
	  LLVM_CONFIG=llvm-config-3.3 \
	  GCC=gcc-4.6 \
	  CC=gcc-4.6 \
	  CXX=g++-4.6 \
	  $(MAKE) -j$(NPROC)

$(DRAGONEGG_SOURCE):
	git clone \
	  --single-branch \
	  --branch="release_33" \
	  --depth=1 \
	  https://github.com/llvm-mirror/dragonegg.git \
	  $(DRAGONEGG_SOURCE)


.PHONY: install
install:
	mkdir -p $(HOST)/lib
	cp $(DRAGONEGG_LIB) $(HOST)/lib/dragonegg.so

.PHONY: clean
clean:
	rm -rf $(ROOT)/build
