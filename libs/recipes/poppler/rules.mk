POPPLER_VERSION = 22.03.0
POPPLER_TARBALL = $(DOWNLOAD)/poppler-$(POPPLER_VERSION).tar.xz
POPPLER_URL = https://poppler.freedesktop.org/poppler-$(POPPLER_VERSION).tar.xz

.PHONY: poppler
poppler: $(POPPLER_WASM_LIB)

$(POPPLER_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(POPPLER_URL) -O $@

$(POPPLER_WASM_LIB): $(POPPLER_TARBALL) $(FC_WASM_LIB) $(CAIRO_WASM_LIB) $(LIBJPEG_WASM_LIB) $(LIBPNG_WASM_LIB) $(LIBTIFF_WASM_LIB)
	mkdir -p $(BUILD)/poppler-$(POPPLER_VERSION)/build
	tar -C $(BUILD) -xf $(POPPLER_TARBALL)
	cd $(BUILD)/poppler-$(POPPLER_VERSION)/build && \
	  emcmake cmake --debug-find \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_SHARED_LIBS=OFF \
	    -DENABLE_LIBOPENJPEG=OFF \
	    -DENABLE_BOOST=OFF \
	    -DENABLE_LCMS=OFF \
	    -DENABLE_GLIB=OFF \
	    -DENABLE_QT5=OFF \
	    -DENABLE_QT6=OFF \
	    -DENABLE_NSS3=OFF \
	     .. && \
	  emmake make install
