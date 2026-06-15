CAIRO_VERSION = 1.18.4
CAIRO_TARBALL = $(DOWNLOAD)/cairo-$(CAIRO_VERSION).tar.xz
CAIRO_URL = https://cairographics.org/releases/cairo-${CAIRO_VERSION}.tar.xz

.PHONY: cairo
cairo: $(CAIRO_WASM_LIB)

$(CAIRO_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(CAIRO_URL) -O $@

$(CAIRO_WASM_LIB): $(CAIRO_TARBALL) $(PIXMAN_WASM_LIB) $(FC_DEPS) $(EM_PKG_CONFIG_PATH)/freetype2.pc
	rm -rf $(BUILD)/cairo-$(CAIRO_VERSION)
	mkdir -p $(BUILD)/cairo-$(CAIRO_VERSION)/build
	tar -C $(BUILD) -xf $(CAIRO_TARBALL)
	cd $(BUILD)/cairo-$(CAIRO_VERSION)/build && \
	  CFLAGS="$(CFLAGS) -DCAIRO_NO_MUTEX=1 -Wno-incompatible-pointer-types" \
	  LDFLAGS="$(LDFLAGS) --use-port=freetype -sUSE_PTHREADS=0" \
	  $(WEBR_ROOT)/libs/tools/gen-meson-cross.sh > cross.txt && \
	  emconfigure meson setup .. \
	    --cross-file cross.txt \
	    --prefix=$(WASM) \
	    --default-library=static \
	    --buildtype=release \
	    -Dtests=disabled \
	    -Dgtk_doc=false \
	    -Dzlib=enabled \
	    -Dpng=enabled \
	    -Dfreetype=enabled \
	    -Dfontconfig=enabled \
	    -Dxlib=disabled \
	    -Dxcb=disabled \
	    -Dxlib-xcb=disabled \
	    -Dquartz=disabled \
	    -Ddwrite=disabled \
	    -Dglib=disabled \
	    -Dspectre=disabled \
	    -Dsymbol-lookup=disabled \
	    -Dgtk2-utils=disabled \
	    -Dlzo=disabled \
	    -Dtee=disabled && \
	  meson compile && \
	  meson install
