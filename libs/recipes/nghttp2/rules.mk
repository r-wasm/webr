NGHTTP2_VERSION = 1.65.0
NGHTTP2_TARBALL = $(DOWNLOAD)/nghttp2-$(NGHTTP2_VERSION).tar.gz
NGHTTP2_URL = https://github.com/nghttp2/nghttp2/releases/download/v$(NGHTTP2_VERSION)/nghttp2-$(NGHTTP2_VERSION).tar.gz

.PHONY: nghttp2
nghttp2: $(NGHTTP2_WASM_LIB)

$(NGHTTP2_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(NGHTTP2_URL) -O $@

$(NGHTTP2_WASM_LIB): $(NGHTTP2_TARBALL)
	mkdir -p $(BUILD)/nghttp2-$(NGHTTP2_VERSION)/build
	tar -C $(BUILD) -xf $(NGHTTP2_TARBALL)
	cd $(BUILD)/nghttp2-$(NGHTTP2_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-lib-only \
	    --prefix=$(WASM) && \
	  emmake make install

