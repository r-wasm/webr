PIXMAN_VERSION = 0.46.4
PIXMAN_TARBALL = $(DOWNLOAD)/pixman-$(PIXMAN_VERSION).tar.gz
PIXMAN_URL = https://cairographics.org/releases/pixman-$(PIXMAN_VERSION).tar.gz

.PHONY: pixman
pixman: $(PIXMAN_WASM_LIB)

$(PIXMAN_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(PIXMAN_URL) -O $@

$(PIXMAN_WASM_LIB): $(PIXMAN_TARBALL) $(LIBPNG_WASM_LIB)
	rm -rf $(BUILD)/pixman-$(PIXMAN_VERSION)
	mkdir -p $(BUILD)/pixman-$(PIXMAN_VERSION)/build
	tar -C $(BUILD) -xf $(PIXMAN_TARBALL)
	cd $(BUILD)/pixman-$(PIXMAN_VERSION)/build && \
	  $(WEBR_ROOT)/libs/tools/gen-meson-cross.sh > cross.txt && \
	  emconfigure meson setup .. \
	    --cross-file cross.txt \
	    --prefix=$(WASM) \
	    --default-library=static \
	    --buildtype=release \
	    -Dtests=disabled \
	    -Ddemos=disabled \
	    -Dgtk=disabled \
	    -Dlibpng=enabled \
	    -Dmmx=disabled \
	    -Dsse2=disabled \
	    -Dssse3=disabled \
	    -Dvmx=disabled \
	    -Darm-simd=disabled \
	    -Dneon=disabled \
	    -Da64-neon=disabled \
	    -Drvv=disabled \
	    -Dmips-dspr2=disabled \
	    -Dloongson-mmi=disabled && \
	  meson compile && \
	  meson install
