EXPAT_VERSION = 2.7.2
EXPAT_VERSION_TAG = R_$(subst .,_,$(EXPAT_VERSION))
EXPAT_TARBALL = $(DOWNLOAD)/expat-$(EXPAT_VERSION).tar.bz2
EXPAT_URL = https://github.com/libexpat/libexpat/releases/download/$(EXPAT_VERSION_TAG)/expat-$(EXPAT_VERSION).tar.bz2

.PHONY: expat
expat: $(EXPAT_WASM_LIB)

$(EXPAT_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(EXPAT_URL) -O $@

# Expat installs cmake helpers that include a check to ensure the expat shared
# library exists on disk. Here, however, we're only building static libs, so we
# patch out the check before installing expat. Without this any build using
# cmake fails after installation, even if expat isn't required.
$(EXPAT_WASM_LIB): $(EXPAT_TARBALL)
	rm -rf $(BUILD)/expat-$(EXPAT_VERSION)
	mkdir -p $(BUILD)/expat-$(EXPAT_VERSION)/build
	tar -C $(BUILD) -xf $(EXPAT_TARBALL)
	cd $(BUILD)/expat-$(EXPAT_VERSION)/build && \
	  sed -i.bak 's/^list(APPEND _cmake_import_check_files_for_expat.*//' \
	    ../cmake/autotools/expat-noconfig__linux.cmake.in && \
	  sed -i.bak 's/^list(APPEND _cmake_import_check_files_for_expat.*//' \
	    ../cmake/autotools/expat-noconfig__macos.cmake.in && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --without-docbook \
	    --without-tests \
	    --without-examples \
	    --without-xmlwf \
	    --prefix=$(WASM) && \
	  emmake make install
