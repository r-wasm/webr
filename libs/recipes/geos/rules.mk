GEOS_VERSION = 3.11.2
GEOS_TARBALL = $(DOWNLOAD)/geos-$(GEOS_VERSION).tar.gz
GEOS_URL = https://download.osgeo.org/geos/geos-$(GEOS_VERSION).tar.bz2

.PHONY: geos
geos: $(GEOS_WASM_LIB)

$(GEOS_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(GEOS_URL) -O $@

$(GEOS_WASM_LIB): $(GEOS_TARBALL)
	mkdir -p $(BUILD)/geos-$(GEOS_VERSION)/build
	tar -C $(BUILD) -xf $(GEOS_TARBALL)
	cd $(BUILD)/geos-$(GEOS_VERSION)/build && \
	  emcmake cmake --debug-find \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_SHARED_LIBS=OFF \
	    -DBUILD_DOCUMENTATION=OFF \
	    -DBUILD_TESTING=OFF \
	    .. && \
	  emmake make install
