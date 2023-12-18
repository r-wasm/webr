LIBWEBP_VERSION = 1.3.2
LIBWEBP_TARBALL = $(DOWNLOAD)/libwebp-$(LIBWEBP_VERSION).tar.gz
LIBWEBP_URL = https://github.com/webmproject/libwebp/archive/v$(LIBWEBP_VERSION).tar.gz

.PHONY: libwebp
libwebp: $(LIBWEBP_WASM_LIB)

$(LIBWEBP_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBWEBP_URL) -O $@

$(LIBWEBP_WASM_LIB): $(LIBWEBP_TARBALL)
	mkdir -p $(BUILD)/libwebp-$(LIBWEBP_VERSION)/build
	tar -C $(BUILD) -xf $(LIBWEBP_TARBALL)
	cd $(BUILD)/libwebp-$(LIBWEBP_VERSION)/build && \
	  emcmake cmake --debug-find \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_SHARED_LIBS=OFF \
	    -DWEBP_BUILD_WEBP_JS=ON \
	    .. && \
	  emmake make install
