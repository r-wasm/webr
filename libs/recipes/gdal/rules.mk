GDAL_VERSION = 3.6.4
GDAL_TARBALL = $(DOWNLOAD)/gdal-$(GDAL_VERSION).tar.gz
GDAL_URL = https://github.com/OSGeo/gdal/releases/download/v$(GDAL_VERSION)/gdal-$(GDAL_VERSION).tar.gz

.PHONY: gdal
gdal: $(GDAL_WASM_LIB)

$(GDAL_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(GDAL_URL) -O $@

# https://gdal.org/development/building_from_source.html

$(GDAL_WASM_LIB): $(GDAL_TARBALL) $(PROJ_WASM_LIB)
	mkdir -p $(BUILD)/gdal-$(GDAL_VERSION)/build
	tar -C $(BUILD) -xf $(GDAL_TARBALL)
	cd $(BUILD)/gdal-$(GDAL_VERSION)/build && \
	  emcmake cmake --debug-find \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_APPS=OFF \
	    -DGDAL_ENABLE_DRIVER_HDF5=OFF \
	    -DGDAL_USE_HDF4=OFF \
	    -DGDAL_USE_HDF5=OFF \
	    .. && \
	  emmake $(MAKE) install
