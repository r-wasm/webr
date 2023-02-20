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

CAIRO_VERSION = 1.14.12
CAIRO_TARBALL = $(DOWNLOAD)/cairo-$(CAIRO_VERSION).tar.xz
CAIRO_URL = https://cairographics.org/releases/cairo-${CAIRO_VERSION}.tar.xz
CAIRO_WASM_LIB = $(WASM)/lib/libcairo.a

FC_VERSION = 2.13.92
FC_TARBALL = $(DOWNLOAD)/fontconfig-$(FC_VERSION).tar.gz
FC_URL = https://www.freedesktop.org/software/fontconfig/release/fontconfig-$(FC_VERSION).tar.gz
FC_WASM_LIB = $(WASM)/lib/libfontconfig.a

LIBPNG_VERSION = 1.6.38
LIBPNG_TARBALL = $(DOWNLOAD)/libpng-$(LIBPNG_VERSION).tar.gz
LIBPNG_URL = http://prdownloads.sourceforge.net/libpng/libpng-$(LIBPNG_VERSION).tar.xz?download
LIBPNG_WASM_LIB = $(WASM)/lib/libpng.a

LIBXML2_VERSION = 2.10.3
LIBXML2_WORDS = $(subst ., ,$(LIBXML2_VERSION))
LIBXML2_SHORT := $(word 1,$(LIBXML2_WORDS)).$(word 2,$(LIBXML2_WORDS))
LIBXML2_TARBALL = $(DOWNLOAD)/libxml2-$(LIBXML2_VERSION).tar.xz
LIBXML2_URL = https://download.gnome.org/sources/libxml2/$(LIBXML2_SHORT)/libxml2-$(LIBXML2_VERSION).tar.xz
LIBXML2_WASM_LIB = $(WASM)/lib/libxml2.a

PCRE_VERSION = 10.39
PCRE_TARBALL = $(DOWNLOAD)/pcre2-$(PCRE_VERSION).tar.gz
PCRE_URL = https://github.com/PhilipHazel/pcre2/releases/download/pcre2-${PCRE_VERSION}/pcre2-$(PCRE_VERSION).tar.gz
PCRE_WASM_LIB = $(WASM)/lib/libpcre2-8.a

PIXMAN_VERSION = 0.38.4
PIXMAN_TARBALL = $(DOWNLOAD)/pixman-$(PIXMAN_VERSION).tar.gz
PIXMAN_URL = https://cairographics.org/releases/pixman-$(PIXMAN_VERSION).tar.gz
PIXMAN_WASM_LIB = $(WASM)/lib/libpixman-1.a

XZ_VERSION = 5.2.5
XZ_TARBALL = $(DOWNLOAD)/xz-$(XZ_VERSION).tar.gz
XZ_URL = https://tukaani.org/xz/xz-$(XZ_VERSION).tar.gz/download
XZ_WASM_LIB = $(WASM)/lib/liblzma.a

WASM_LIBS := $(CAIRO_WASM_LIB)
WASM_LIBS += $(FC_WASM_LIB)
WASM_LIBS += $(LIBPNG_WASM_LIB)
WASM_LIBS += $(LIBXML2_WASM_LIB)
WASM_LIBS += $(PCRE_WASM_LIB)
WASM_LIBS += $(PIXMAN_WASM_LIB)
WASM_LIBS += $(XZ_WASM_LIB)

all: $(WASM_LIBS)

.PHONY: cairo
cairo: $(CAIRO_WASM_LIB)

$(CAIRO_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(CAIRO_URL)

$(CAIRO_WASM_LIB): $(CAIRO_TARBALL) $(PIXMAN_WASM_LIB) $(FC_WASM_LIB)
	rm -rf $(BUILD)/cairo-$(CAIRO_VERSION)
	tar -C $(BUILD) -xf $(CAIRO_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/cairo-$(CAIRO_VERSION)/." \
	  "$(BUILD)/cairo-$(CAIRO_VERSION)/patches"
	cd "$(BUILD)/cairo-$(CAIRO_VERSION)" && quilt push -a
	mkdir -p $(BUILD)/cairo-$(CAIRO_VERSION)/build
	cd $(BUILD)/cairo-$(CAIRO_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS) -DCAIRO_NO_MUTEX=1" \
	  LDFLAGS="-sUSE_FREETYPE=1" \
	  FREETYPE_CFLAGS="-sUSE_FREETYPE=1" \
	  FREETYPE_LIBS="-sUSE_FREETYPE=1" \
	  EM_PKG_CONFIG_PATH="$(WASM)/lib/pkgconfig" \
	  emconfigure ../configure \
	    ax_cv_c_float_words_bigendian=no \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-pthread=no \
	    --enable-ft=yes \
	    --enable-fc=yes \
	    --prefix=$(WASM) && \
	  emmake make install
	sed -i.bak -e 's/freetype2 >= [0-9]*\.[0-9]*\.[0-9]*//g' \
		-e 's/-lz//2' $(WASM)/lib/pkgconfig/cairo.pc
	sed -i.bak -e 's/freetype2 >= [0-9]*\.[0-9]*\.[0-9]*//g' $(WASM)/lib/pkgconfig/cairo-ft.pc
	touch $@

.PHONY: fontconfig
fontconfig: $(FC_WASM_LIB)

$(FC_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(FC_URL)

$(FC_WASM_LIB): $(FC_TARBALL) $(LIBXML2_WASM_LIB)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(FC_TARBALL)
	mkdir -p $(BUILD)/fontconfig-$(FC_VERSION)/build
	sed -i.bak 's/ax_pthread_ok=yes/ax_pthread_ok=no/g' \
	  $(BUILD)/fontconfig-$(FC_VERSION)/configure
	sed -i.bak 's/RUN_FC_CACHE_TEST =.*/RUN_FC_CACHE_TEST = false/g' \
	  $(BUILD)/fontconfig-$(FC_VERSION)/Makefile.in
	cd $(BUILD)/fontconfig-$(FC_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  FREETYPE_CFLAGS="-sUSE_FREETYPE=1" \
	  FREETYPE_LIBS="-sUSE_FREETYPE=1" \
	  LDFLAGS="-sUSE_FREETYPE=1" \
	  EM_PKG_CONFIG_PATH="$(WASM)/lib/pkgconfig" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-libxml2 \
	    --prefix=$(WASM)
	sed -i.bak 's/#define HAVE_FSTATFS 1/#undef HAVE_FSTATFS/' \
	  $(BUILD)/fontconfig-$(FC_VERSION)/build/config.h
	cd $(BUILD)/fontconfig-$(FC_VERSION)/build && \
	  emmake make install
	sed -i.bak 's/Requires:.*/Requires:/' $(WASM)/lib/pkgconfig/fontconfig.pc
	touch $@

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

.PHONY: libxml2
libxml2: $(LIBXML2_WASM_LIB)

$(LIBXML2_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(LIBXML2_URL)

$(LIBXML2_WASM_LIB): $(LIBXML2_TARBALL) $(ZLIB_WASM_LIB) $(XZ_WASM_LIB)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(LIBXML2_TARBALL)
	mkdir -p $(BUILD)/libxml2-$(LIBXML2_VERSION)/build
	cd $(BUILD)/libxml2-$(LIBXML2_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  EM_PKG_CONFIG_PATH="$(WASM)/lib/pkgconfig" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --without-python \
	    --without-threads \
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

.PHONY: pixman
pixman: $(PIXMAN_WASM_LIB)

$(PIXMAN_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PIXMAN_URL)

$(PIXMAN_WASM_LIB): $(PIXMAN_TARBALL) $(LIBPNG_WASM_LIB)
	tar -C $(BUILD) -xf $(PIXMAN_TARBALL)
	mkdir -p $(BUILD)/pixman-$(PIXMAN_VERSION)/build
	sed -i.bak 's/support_for_pthreads=yes/support_for_pthreads=no/g' \
	  $(BUILD)/pixman-$(PIXMAN_VERSION)/configure
	cd $(BUILD)/pixman-$(PIXMAN_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  EM_PKG_CONFIG_PATH="$(WASM)/lib/pkgconfig" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install

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
	    --enable-threads=no \
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
