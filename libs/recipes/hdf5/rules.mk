HDF5_VERSION = 1.12.3
HDF5_VERSION_UNDERSCORE = 1_12_3
HDF5_TARBALL = $(DOWNLOAD)/hdf5-$(HDF5_VERSION_UNDERSCORE).tar.gz
HDF5_URL = https://github.com/HDFGroup/hdf5/releases/download/hdf5-$(HDF5_VERSION_UNDERSCORE)/hdf5-$(HDF5_VERSION_UNDERSCORE).tar.gz


.PHONY: hdf5
hdf5: $(HDF5_WASM_LIB)

$(HDF5_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(HDF5_URL) -O $@

# How to include --with-szlib=zlib?

$(HDF5_WASM_LIB): $(HDF5_TARBALL)
	mkdir -p $(BUILD)/hdf5-$(HDF5_VERSION)/hdfsrc/build
	tar -C $(BUILD)/hdf5-$(HDF5_VERSION) -xf $(HDF5_TARBALL)
	cd $(BUILD)/hdf5-$(HDF5_VERSION)/hdfsrc/build && \
	emconfigure ../configure \
		--enable-build-mode=production \ 
		--disable-dependency-tracking \ 
		--disable-silent-rules \ 
		--enable-shared=no \
		--enable-static=yes \
		--prefix=$(WASM) && \
	emmake make install

