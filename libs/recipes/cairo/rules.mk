CAIRO_VERSION = 1.14.12
CAIRO_TARBALL = $(DOWNLOAD)/cairo-$(CAIRO_VERSION).tar.xz
CAIRO_URL = https://cairographics.org/releases/cairo-${CAIRO_VERSION}.tar.xz

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
	  CFLAGS="$(CFLAGS) -DCAIRO_NO_MUTEX=1" \
	  LDFLAGS="$(LDFLAGS) -sUSE_FREETYPE=1 -sUSE_PTHREADS=0" \
	  emconfigure ../configure \
	    ax_cv_c_float_words_bigendian=no \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-pthread=no \
	    --enable-ft=yes \
	    --enable-fc=yes \
	    --enable-xlib=no \
	    --prefix=$(WASM) && \
	  emmake make install
