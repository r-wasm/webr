HDF5_VERSION = 1.14.6
HDF5_TARBALL = $(DOWNLOAD)/hdf5-$(HDF5_VERSION).tar.gz
HDF5_URL = https://github.com/HDFGroup/hdf5/releases/download/hdf5_$(HDF5_VERSION)/hdf5-$(HDF5_VERSION).tar.gz


.PHONY: hdf5
hdf5: $(HDF5_WASM_LIB)

$(HDF5_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(HDF5_URL) -O $@

# Emscripten's fenv.h does not define FE_INVALID because wasm has no
# floating-point exception flags; feclearexcept(0) is a no-op. Pass it
# at make time so it does not end up in the h5cc and h5c++ wrappers.
#
# Side modules link archives whole, so libraries that are linked twice
# cause duplicate symbol errors. Drop -lz everywhere because zlib comes
# from the Emscripten port (-s USE_ZLIB=1) and packages often add -lz.
#
# The autotools build of libaec produces a libsz.a that does not include
# the aec functions it wraps, so add -laec wherever -lsz is linked.
#
# Rhdf5lib parses "Extra libraries" in libhdf5.settings in the format
# written by CMake builds (e.g. "dl;m") and prefixes each entry with -l.
# Convert the autotools format ("-lsz -laec -ldl -lm") to match. Drop sz
# because Rhdf5lib already adds -lsz when it finds libsz.a.

$(HDF5_WASM_LIB): $(HDF5_TARBALL)
	rm -rf $(BUILD)/hdf5-$(HDF5_VERSION)
	mkdir -p $(BUILD)/hdf5-$(HDF5_VERSION)/build
	tar -C $(BUILD) -xf $(HDF5_TARBALL)
	cd $(BUILD)/hdf5-$(HDF5_VERSION)/build && \
	RUNSERIAL="node" RUNPARALLEL="node" \
	emconfigure ../configure \
	  --enable-build-mode=production \
	  --enable-cxx \
	  --disable-dependency-tracking \
	  --disable-silent-rules \
	  --disable-tests \
	  --enable-shared=no \
	  --enable-static=yes \
	  --prefix=$(WASM) && \
	emmake make CPPFLAGS="$(CPPFLAGS) -DFE_INVALID=0" && \
	sed -E -i.bak '/H5BLD_LIBS=|Extra libraries:/{s/-lz //;s/-lsz /-lsz -laec /;}' bin/h5cc c++/src/h5c++ src/libhdf5.settings && \
	sed -i.bak '/Extra libraries:/{s/ -l/;/g;s/:;/: /;s/: sz;/: /;s/ *$$//;}' src/libhdf5.settings && \
	emmake make install
