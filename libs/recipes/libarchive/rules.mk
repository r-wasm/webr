LIBARCHIVE_VERSION = 3.7.2
LIBARCHIVE_TARBALL = $(DOWNLOAD)/libarchive-$(LIBARCHIVE_VERSION).tar.gz
LIBARCHIVE_URL = https://www.libarchive.org/downloads/libarchive-$(LIBARCHIVE_VERSION).tar.xz

.PHONY: libarchive
libarchive: $(LIBARCHIVE_WASM_LIB)

$(LIBARCHIVE_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBARCHIVE_URL) -O $@

$(LIBARCHIVE_WASM_LIB): $(LIBARCHIVE_TARBALL) $(XZ_WASM_LIB) $(ZSTD_WASM_LIB) $(LZ4_WASM_LIB) $(EXPAT_WASM_LIB)
	mkdir -p $(BUILD)/libarchive-$(LIBARCHIVE_VERSION)/build
	tar -C $(BUILD) -xf $(LIBARCHIVE_TARBALL)
	cd $(BUILD)/libarchive-$(LIBARCHIVE_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --with-expat \
	    --with-zstd \
	    --with-zlib \
	    --with-lz4 \
	    --with-lzma \
	    --without-lzo2 \
	    --without-nettle \
	    --without-xml2 \
	    --without-openssl \
	    --prefix=$(WASM) && \
	  emmake make install
