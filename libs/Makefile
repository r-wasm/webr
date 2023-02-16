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
WASM_CFLAGS += -s USE_BZIP2=1 -s USE_ZLIB=1

LIBPNG_VERSION = 1.6.38
LIBPNG_TARBALL = $(DOWNLOAD)/libpng-$(LIBPNG_VERSION).tar.gz
LIBPNG_URL = http://prdownloads.sourceforge.net/libpng/libpng-$(LIBPNG_VERSION).tar.xz?download
LIBPNG_WASM_LIB = $(WASM)/lib/libpng.a

PCRE_VERSION = 10.39
PCRE_TARBALL = $(DOWNLOAD)/pcre2-$(PCRE_VERSION).tar.gz
PCRE_URL = https://github.com/PhilipHazel/pcre2/releases/download/pcre2-${PCRE_VERSION}/pcre2-$(PCRE_VERSION).tar.gz
PCRE_WASM_LIB = $(WASM)/lib/libpcre2-8.a

XZ_VERSION = 5.2.5
XZ_TARBALL = $(DOWNLOAD)/xz-$(XZ_VERSION).tar.gz
XZ_URL = https://tukaani.org/xz/xz-$(XZ_VERSION).tar.gz/download
XZ_WASM_LIB = $(WASM)/lib/liblzma.a

WASM_LIBS = $(LIBPNG_WASM_LIB) $(PCRE_WASM_LIB) $(XZ_WASM_LIB)

all: $(WASM_LIBS)

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

.PHONY: pcre2
pcre2: $(PCRE_WASM_LIB)

$(PCRE_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PCRE_URL)

$(PCRE_WASM_LIB): $(PCRE_TARBALL)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(PCRE_TARBALL)
	mkdir -p $(BUILD)/pcre2-$(PCRE_VERSION)/build
	cd $(BUILD)/pcre2-$(PCRE_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
	touch $@

.PHONY: xz
xz: $(XZ_WASM_LIB)

$(XZ_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(XZ_URL) -O $@

$(XZ_WASM_LIB): $(XZ_TARBALL)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(XZ_TARBALL)
	cd $(BUILD)/xz-$(XZ_VERSION) && \
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
	rm -f $(WASM_LIBS)

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
