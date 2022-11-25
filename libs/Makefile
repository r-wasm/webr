WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)

DOWNLOAD = $(ROOT)/download
BUILD = $(ROOT)/build
DIST = $(WEBR_ROOT)/dist
TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm


WASM_OPT ?= -Oz
WASM_OPT_LDADD ?= $(WASM_OPT)

WASM_CFLAGS := $(WASM_CFLAGS)
WASM_CFLAGS += -fPIC -fno-exceptions -fno-rtti $(WASM_OPT)


LIBPNG_VERSION = 1.6.38
LIBPNG_TARBALL = $(DOWNLOAD)/libpng-$(LIBPNG_VERSION).tar.gz
LIBPNG_URL = http://prdownloads.sourceforge.net/libpng/libpng-$(LIBPNG_VERSION).tar.xz?download
LIBPNG_WASM_LIB = $(WASM)/lib/libpng.a


.PHONY: libpng
libpng: $(LIBPNG_WASM_LIB)

$(LIBPNG_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBPNG_URL) -O $@

$(LIBPNG_WASM_LIB): $(LIBPNG_TARBALL)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(LIBPNG_TARBALL)
	cd $(BUILD)/libpng-$(LIBPNG_VERSION) && \
	  mkdir -p build && \
	  cd build && \
	  CFLAGS="$(WASM_CFLAGS)" emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
	touch $@


.PHONY: clean
clean:
	rm -rf $(DOWNLOAD) $(BUILD)
	rm -f $(LIBPNG_WASM_LIB)


# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
