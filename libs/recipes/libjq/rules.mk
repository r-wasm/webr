LIBJQ_VERSION = 1.8.1
LIBJQ_TARBALL = $(DOWNLOAD)/jq-$(LIBJQ_VERSION).tar.gz
LIBJQ_URL = https://github.com/jqlang/jq/releases/download/jq-$(LIBJQ_VERSION)/jq-$(LIBJQ_VERSION).tar.gz

.PHONY: libjq
libjq: $(LIBJQ_WASM_LIB)

$(LIBJQ_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBJQ_URL) -O $@

$(LIBJQ_WASM_LIB): $(LIBJQ_TARBALL)
	mkdir -p $(BUILD)/jq-$(LIBJQ_VERSION)/build
	tar -C $(BUILD) -xf $(LIBJQ_TARBALL)
	cd $(BUILD)/jq-$(LIBJQ_VERSION)/build && \
	  emconfigure ../configure \
	    --host=wasm32-unknown-emscripten \
	    --enable-shared=no \
	    --enable-static=yes \
	    --disable-maintainer-mode \
	    --disable-docs \
	    --without-oniguruma \
	    --prefix=$(WASM) && \
	  emmake make install
