ONETBB_VERSION = 2021.12.0
ONETBB_TARBALL = $(DOWNLOAD)/oneTBB-$(ONETBB_VERSION).tar.gz
ONETBB_URL = https://github.com/oneapi-src/oneTBB/archive/refs/tags/v$(ONETBB_VERSION).tar.gz

.PHONY: oneTBB
oneTBB: $(ONETBB_WASM_LIB)

$(ONETBB_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(ONETBB_URL) -O $@

$(ONETBB_WASM_LIB): $(ONETBB_TARBALL)
	mkdir -p $(BUILD)/oneTBB-$(ONETBB_VERSION)/build
	tar -C $(BUILD) -xf $(ONETBB_TARBALL)
	cd $(BUILD)/oneTBB-$(ONETBB_VERSION)/build && \
	  emcmake cmake \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DTBB_STRICT=OFF \
	    -DCMAKE_CXX_FLAGS=-Wno-unused-command-line-argument \
	    -DTBB_DISABLE_HWLOC_AUTOMATIC_SEARCH=ON \
	    -DBUILD_SHARED_LIBS=OFF \
	    -DTBB_EXAMPLES=OFF \
	    -DTBB_TEST=OFF \
	    -DEMSCRIPTEN_WITHOUT_PTHREAD=true \
	    .. && \
	  cmake --build . && \
	  cmake --install .
