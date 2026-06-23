BLOSC_VERSION = 1.21.6
BLOSC_TARBALL = $(DOWNLOAD)/blosc-$(BLOSC_VERSION).tar.gz
BLOSC_URL = https://github.com/Blosc/c-blosc/archive/refs/tags/v$(BLOSC_VERSION).tar.gz

.PHONY: blosc
blosc: $(BLOSC_WASM_LIB)

$(BLOSC_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(BLOSC_URL) -O $@

$(BLOSC_WASM_LIB): $(BLOSC_TARBALL) $(ZSTD_WASM_LIB) $(LZ4_WASM_LIB) $(ZLIB_WASM_LIB)
	mkdir -p $(BUILD)/blosc-$(BLOSC_VERSION)/build
	tar -C $(BUILD) -xf $(BLOSC_TARBALL)
	cd $(BUILD)/blosc-$(BLOSC_VERSION)/build && \
	  PKG_CONFIG="pkg-config --static" emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --with-zstd \
	    --with-zlib \
	    --with-lz4 \
	    --prefix=$(WASM) && \
	  emmake make install
