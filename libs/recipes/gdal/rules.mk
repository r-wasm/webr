GDAL_VERSION = 3.6.4
GDAL_TARBALL = $(DOWNLOAD)/gdal-$(GDAL_VERSION).tar.gz
GDAL_URL = https://github.com/OSGeo/gdal/releases/download/v$(GDAL_VERSION)/gdal-$(GDAL_VERSION).tar.gz

.PHONY: gdal
gdal: $(GDAL_WASM_LIB)

$(GDAL_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(GDAL_URL) -O $@

# https://gdal.org/development/building_from_source.html

# There is one configure helper that makes an erroneous conclusion
# about the signature of an iconv function because building the test
# file fails with an unrelated Emscripten error about a missing symbol.
# To work around, we just fix the setting directly in `cpl_config.h`.

# The `CONFIG_DEP_LIBS` field in `gdal-config` needs two edits. First
# remove `-lproj` to avoid duplicates in build command that include
# both `gdal-config --dep-libs` and `pkg-config proj --libs`.
# Emscripten expands those flags to the `libproj.a` archive file,
# which causes duplicate symbols errors.
#
# Second, remove the `-L/path/to/emscripten/sysroot/wasm32-emscripten`
# flag. This directory contains non-fPIC libraries. Not sure why the
# `pic` subfolder isn't selected.

$(GDAL_WASM_LIB): $(GDAL_TARBALL) $(PROJ_WASM_LIB)
	mkdir -p $(BUILD)/gdal-$(GDAL_VERSION)/build
	tar -C $(BUILD) -xf $(GDAL_TARBALL)
	cd $(BUILD)/gdal-$(GDAL_VERSION)/build && \
	  emcmake cmake --debug-find \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_TESTING=OFF \
	    -DBUILD_APPS=OFF \
	    -DGDAL_ENABLE_DRIVER_HDF5=OFF \
	    -DGDAL_USE_HDF4=OFF \
	    -DGDAL_USE_HDF5=OFF \
	    .. && \
	  sed -i.bak 's/#define ICONV_CPP_CONST const/#define ICONV_CPP_CONST/' port/cpl_config.h && \
	  emmake make install && \
	  sed -i.bak 's/\(^CONFIG_DEP_LIBS=.*\) -lproj\(.*\)/\1\2/' $(WASM)/bin/gdal-config && \
	  sed -i.bak 's/\(^CONFIG_DEP_LIBS=.*\)-L.*wasm32-emscripten\(.*\)/\1 \2/' $(WASM)/bin/gdal-config
