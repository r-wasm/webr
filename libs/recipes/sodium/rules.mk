LIBSODIUM_VERSION = 1.0.18
LIBSODIUM_TARBALL = $(DOWNLOAD)/libsodium-$(LIBSODIUM_VERSION).tar.gz
LIBSODIUM_URL = https://download.libsodium.org/libsodium/releases/libsodium-${LIBSODIUM_VERSION}.tar.gz

.PHONY: libsodium
libsodium: $(LIBSODIUM_WASM_LIB)

$(LIBSODIUM_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBSODIUM_URL) -O $@

$(LIBSODIUM_WASM_LIB): $(LIBSODIUM_TARBALL) 
	mkdir -p $(BUILD)/libsodium-$(LIBSODIUM_VERSION)/build
	tar -C $(BUILD) -xf $(LIBSODIUM_TARBALL)
	cd $(BUILD)/libsodium-$(LIBSODIUM_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --without-pthreads \
	    --disable-ssp \
	    --prefix=$(WASM) && \
	  emmake make install
