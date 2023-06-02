EXPAT_VERSION = 2.5.0
EXPAT_TARBALL = $(DOWNLOAD)/expat-$(EXPAT_VERSION).tar.gz
EXPAT_URL = https://github.com/libexpat/libexpat/releases/download/R_2_5_0/expat-$(EXPAT_VERSION).tar.bz2

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
	    --prefix=$(WASM) && \
	  emmake make install
