WEBR_ROOT = $(abspath ..)
ROOT = $(abspath .)

DOWNLOAD = $(ROOT)/download
FONTS = $(DOWNLOAD)/fonts
BUILD = $(ROOT)/build
DIST = $(WEBR_ROOT)/dist
TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

export EM_PKG_CONFIG_PATH = $(WASM)/lib/pkgconfig

WASM_OPT ?= -Oz
WASM_OPT_LDADD ?= $(WASM_OPT)

WASM_CFLAGS := $(WASM_CFLAGS)
WASM_CFLAGS += -fPIC -fno-exceptions -fno-rtti $(WASM_OPT)
WASM_CFLAGS += -s USE_BZIP2=1 -s USE_ZLIB=1

CAIRO_VERSION = 1.14.12
CAIRO_TARBALL = $(DOWNLOAD)/cairo-$(CAIRO_VERSION).tar.xz
CAIRO_URL = https://cairographics.org/releases/cairo-${CAIRO_VERSION}.tar.xz
CAIRO_WASM_LIB = $(WASM)/lib/libcairo.a

FC_VERSION = 2.12.5
FC_TARBALL = $(DOWNLOAD)/fontconfig-$(FC_VERSION).tar.gz
FC_URL = https://www.freedesktop.org/software/fontconfig/release/fontconfig-$(FC_VERSION).tar.gz
FC_WASM_LIB = $(WASM)/lib/libfontconfig.a
FC_DEPS = $(FC_WASM_LIB) $(EM_PKG_CONFIG_PATH)/fontconfig.pc

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


all: $(WASM_LIBS) $(WASM)/usr/share/fonts

$(EM_PKG_CONFIG_PATH)/%.pc: %.pc
	mkdir -p $(EM_PKG_CONFIG_PATH)
	cp "$<" "$@"

.PHONY: cairo
cairo: $(CAIRO_WASM_LIB)

$(CAIRO_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(CAIRO_URL)

$(CAIRO_WASM_LIB): $(CAIRO_TARBALL) $(PIXMAN_WASM_LIB) $(FC_DEPS)
	rm -rf $(BUILD)/cairo-$(CAIRO_VERSION)
	mkdir -p $(BUILD)/cairo-$(CAIRO_VERSION)/build
	tar -C $(BUILD) -xf $(CAIRO_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/cairo-$(CAIRO_VERSION)/." \
	  "$(BUILD)/cairo-$(CAIRO_VERSION)/patches"
	cd $(BUILD)/cairo-$(CAIRO_VERSION)/build && quilt push -a && \
	  CFLAGS="$(WASM_CFLAGS) -DCAIRO_NO_MUTEX=1" \
	  LDFLAGS="-sUSE_FREETYPE=1 -sUSE_PTHREADS=0" \
	  emconfigure ../configure \
	    ax_cv_c_float_words_bigendian=no \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-pthread=no \
	    --enable-ft=yes \
	    --enable-fc=yes \
	    --prefix=$(WASM) && \
	  emmake make install

.PHONY: fontconfig
fontconfig: $(FC_DEPS)

$(FC_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(FC_URL)

$(FC_DEPS): $(FC_TARBALL) $(LIBXML2_WASM_LIB) $(EM_PKG_CONFIG_PATH)/freetype2.pc
	mkdir -p $(BUILD)/fontconfig-$(FC_VERSION)/build
	tar -C $(BUILD) -xf $(FC_TARBALL) --exclude=fcobjshash.h
	cd $(BUILD)/fontconfig-$(FC_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  LDFLAGS="-sUSE_FREETYPE=1 -sUSE_PTHREADS=0" \
	  PTHREAD_CFLAGS=" " \
	  emconfigure ../configure \
	    ac_cv_func_fstatfs=no \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-libxml2 \
	    --prefix=$(WASM) && \
	  emmake make RUN_FC_CACHE_TEST=false install

.PHONY: libpng
libpng: $(LIBPNG_WASM_LIB)

$(LIBPNG_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBPNG_URL) -O $@

$(LIBPNG_WASM_LIB): $(LIBPNG_TARBALL) $(EM_PKG_CONFIG_PATH)/zlib.pc
	mkdir -p $(BUILD)/libpng-$(LIBPNG_VERSION)/build
	tar -C $(BUILD) -xf $(LIBPNG_TARBALL)
	cd $(BUILD)/libpng-$(LIBPNG_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install

.PHONY: libxml2
libxml2: $(LIBXML2_WASM_LIB)

$(LIBXML2_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(LIBXML2_URL)

$(LIBXML2_WASM_LIB): $(LIBXML2_TARBALL) $(XZ_WASM_LIB)
	mkdir -p $(BUILD)/libxml2-$(LIBXML2_VERSION)/build
	tar -C $(BUILD) -xf $(LIBXML2_TARBALL)
	cd $(BUILD)/libxml2-$(LIBXML2_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --without-python \
	    --without-threads \
	    --prefix=$(WASM) && \
	  emmake make install

.PHONY: pcre2
pcre2: $(PCRE_WASM_LIB)

$(PCRE_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PCRE_URL)

$(PCRE_WASM_LIB): $(PCRE_TARBALL)
	mkdir -p $(BUILD)/pcre2-$(PCRE_VERSION)/build
	tar -C $(BUILD) -xf $(PCRE_TARBALL)
	cd $(BUILD)/pcre2-$(PCRE_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install

.PHONY: pixman
pixman: $(PIXMAN_WASM_LIB)

$(PIXMAN_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PIXMAN_URL)

$(PIXMAN_WASM_LIB): $(PIXMAN_TARBALL) $(LIBPNG_WASM_LIB)
	mkdir -p $(BUILD)/pixman-$(PIXMAN_VERSION)/build
	tar -C $(BUILD) -xf $(PIXMAN_TARBALL)
	sed -i.bak 's/support_for_pthreads=yes/support_for_pthreads=no/g' \
	  $(BUILD)/pixman-$(PIXMAN_VERSION)/configure
	cd $(BUILD)/pixman-$(PIXMAN_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
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
	mkdir -p $(BUILD)/xz-$(XZ_VERSION)/build
	tar -C $(BUILD) -xf $(XZ_TARBALL)
	cd $(BUILD)/xz-$(XZ_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-threads=no \
	    --prefix=$(WASM) && \
	  emmake make install

.PHONY: fonts
fonts: $(WASM)/usr/share/fonts

$(WASM)/usr/share/fonts:
	mkdir -p "$(FONTS)" "$(WASM)/usr/share/fonts" "$(WASM)/etc/fonts/"
	wget -O $(FONTS)/NotoSans.zip https://fonts.google.com/download?family=Noto%20Sans
	unzip -p $(FONTS)/NotoSans.zip NotoSans-Regular.ttf > $(FONTS)/NotoSans-Regular.ttf
	unzip -p $(FONTS)/NotoSans.zip NotoSans-Bold.ttf > $(FONTS)/NotoSans-Bold.ttf
	unzip -p $(FONTS)/NotoSans.zip NotoSans-Italic.ttf > $(FONTS)/NotoSans-Italic.ttf
	unzip -p $(FONTS)/NotoSans.zip NotoSans-BoldItalic.ttf > $(FONTS)/NotoSans-BoldItalic.ttf
	rm $(FONTS)/NotoSans.zip
	wget -O $(FONTS)/NotoSerif.zip https://fonts.google.com/download?family=Noto%20Serif
	unzip -p $(FONTS)/NotoSerif.zip NotoSerif-Regular.ttf > $(FONTS)/NotoSerif-Regular.ttf
	unzip -p $(FONTS)/NotoSerif.zip NotoSerif-Bold.ttf > $(FONTS)/NotoSerif-Bold.ttf
	unzip -p $(FONTS)/NotoSerif.zip NotoSerif-Italic.ttf > $(FONTS)/NotoSerif-Italic.ttf
	unzip -p $(FONTS)/NotoSerif.zip NotoSerif-BoldItalic.ttf > $(FONTS)/NotoSerif-BoldItalic.ttf
	rm $(FONTS)/NotoSerif.zip
	wget -q -O $(FONTS)/NotoSansMono.zip https://fonts.google.com/download?family=Noto%20Sans%20Mono
	unzip -p $(FONTS)/NotoSansMono.zip static/NotoSansMono/NotoSansMono-Regular.ttf > $(FONTS)/NotoSansMono-Regular.ttf
	unzip -p $(FONTS)/NotoSansMono.zip static/NotoSansMono/NotoSansMono-Bold.ttf > $(FONTS)/NotoSansMono-Bold.ttf
	rm $(FONTS)/NotoSansMono.zip
	cp -r "$(FONTS)/." "$(WASM)/usr/share/fonts"
	cp fonts.conf "$(WASM)/etc/fonts/local.conf"

clean-fonts:
	rm -rf "$(FONTS)" "$(WASM)/usr/share/fonts" "$(WASM)/etc/fonts/local.conf"

.PHONY: clean
clean:
	rm -rf $(DOWNLOAD) $(BUILD)
	rm -f $(WASM_LIBS)

# Print Makefile variable
.PHONY: print-%
print-%  : ; @echo $* = $($*)
