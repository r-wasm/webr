ZSTD_VERSION = 1.5.5
ZSTD_TARBALL = $(DOWNLOAD)/zstd-$(ZSTD_VERSION).tar.gz
ZSTD_URL = https://github.com/facebook/zstd/archive/refs/tags/v$(ZSTD_VERSION).tar.gz

.PHONY: zstd
zstd: $(ZSTD_WASM_LIB)

$(ZSTD_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(ZSTD_URL) -O $@

$(ZSTD_WASM_LIB): $(ZSTD_TARBALL)
	mkdir -p $(BUILD)/zstd-$(ZSTD_VERSION)/mybuild
	tar -C $(BUILD) -xf $(ZSTD_TARBALL)
	cd $(BUILD)/zstd-$(ZSTD_VERSION)/mybuild && \
	  emcmake cmake --debug-find \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_SHARED_LIBS=OFF \
	    -DZSTD_BUILD_PROGRAMS=OFF \
	    -DZSTD_MULTITHREAD_SUPPORT=OFF \
	    -DZSTD_BUILD_STATIC=ON \
	    -DZSTD_BUILD_SHARED=OFF \
	    -DCMAKE_CXX_STANDARD=11 \
	    ../build/cmake && \
	  emmake make install
