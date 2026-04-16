LIBTIFF_VERSION = 4.7.1
LIBTIFF_TARBALL = $(DOWNLOAD)/libtiff-$(LIBTIFF_VERSION).tar.gz
LIBTIFF_URL = http://download.osgeo.org/libtiff/tiff-$(LIBTIFF_VERSION).tar.gz

.PHONY: libtiff
libtiff: $(LIBTIFF_WASM_LIB)

$(LIBTIFF_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBTIFF_URL) -O $@

$(LIBTIFF_WASM_LIB): $(LIBTIFF_TARBALL) $(LIBJPEG_WASM_LIB)
	rm -rf $(BUILD)/tiff-$(LIBTIFF_VERSION)
	mkdir -p $(BUILD)/tiff-$(LIBTIFF_VERSION)
	tar -C $(BUILD) -xf $(LIBTIFF_TARBALL)
	cd $(BUILD)/tiff-$(LIBTIFF_VERSION) && \
	  emconfigure ./configure \
	    --enable-shared=no \
	    --enable-static=yes \
		--enable-webp=no \
	    --prefix=$(WASM) && \
	  emmake make install
