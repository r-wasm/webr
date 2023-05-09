LIBPNG_VERSION = 1.6.38
LIBPNG_TARBALL = $(DOWNLOAD)/libpng-$(LIBPNG_VERSION).tar.gz
LIBPNG_URL = http://prdownloads.sourceforge.net/libpng/libpng-$(LIBPNG_VERSION).tar.xz?download

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
