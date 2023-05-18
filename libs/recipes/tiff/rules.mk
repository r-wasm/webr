LIBTIFF_VERSION = 4.0.6
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
	cp -r "$(WEBR_ROOT)/patches/tiff-$(LIBTIFF_VERSION)/." \
	  "$(BUILD)/tiff-$(LIBTIFF_VERSION)/patches"
	cd $(BUILD)/tiff-$(LIBTIFF_VERSION) && quilt push -a && \
	  emconfigure ./configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
