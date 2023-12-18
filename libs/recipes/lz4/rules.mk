LZ4_VERSION = 1.9.4
LZ4_TARBALL = $(DOWNLOAD)/lz4-$(LZ4_VERSION).tar.gz
LZ4_URL = https://github.com/lz4/lz4/archive/refs/tags/v$(LZ4_VERSION).tar.gz

.PHONY: lz4
lz4: $(LZ4_WASM_LIB)

$(LZ4_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LZ4_URL) -O $@

$(LZ4_WASM_LIB): $(LZ4_TARBALL)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(LZ4_TARBALL)
	cd $(BUILD)/lz4-$(LZ4_VERSION)/lib && \
	emmake make BUILD_SHARED=no DESTDIR=$(WASM) PREFIX="" install VERBOSE=1 

