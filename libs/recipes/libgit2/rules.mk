LIBGIT2_VERSION = 1.7.1
LIBGIT2_TARBALL = $(DOWNLOAD)/libgit2-$(LIBGIT2_VERSION).tar.gz
LIBGIT2_URL = https://github.com/libgit2/libgit2/archive/refs/tags/v$(LIBGIT2_VERSION).tar.gz

.PHONY: libgit2
libgit2: $(LIBGIT2_WASM_LIB)

$(LIBGIT2_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBGIT2_URL) -O $@

$(LIBGIT2_WASM_LIB): $(LIBGIT2_TARBALL)
	mkdir -p $(BUILD)/libgit2-$(LIBGIT2_VERSION)/build
	tar -C $(BUILD) -xf $(LIBGIT2_TARBALL)
	cd $(BUILD)/libgit2-$(LIBGIT2_VERSION)/build && \
	  emcmake cmake --debug-find \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_SHARED_LIBS=OFF \
	    -DUSE_THREADS=OFF \
	    -DUSE_SSH=OFF \
	    -DUSE_HTTPS=OFF \
	    -DBUILD_EXAMPLES=OFF \
	    -DBUILD_TESTS=OFF \
	    -DBUILD_CLI=OFF \
	    .. && \
	  emmake make install
