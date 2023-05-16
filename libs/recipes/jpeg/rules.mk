LIBJPEG_VERSION = 9b
LIBJPEG_TARBALL = $(DOWNLOAD)/libjpeg-$(LIBJPEG_VERSION).tar.gz
LIBJPEG_URL = http://www.ijg.org/files/jpegsrc.v$(LIBJPEG_VERSION).tar.gz

.PHONY: libjpeg
libjpeg: $(LIBJPEG_WASM_LIB)

$(LIBJPEG_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBJPEG_URL) -O $@

$(LIBJPEG_WASM_LIB): $(LIBJPEG_TARBALL)
	mkdir -p $(BUILD)/jpeg-$(LIBJPEG_VERSION)/build
	tar -C $(BUILD) -xf $(LIBJPEG_TARBALL)
	cd $(BUILD)/jpeg-$(LIBJPEG_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
