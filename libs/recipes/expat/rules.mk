EXPAT_VERSION = 2.5.0
EXPAT_TARBALL = $(DOWNLOAD)/expat-$(EXPAT_VERSION).tar.gz
EXPAT_URL = https://github.com/libexpat/libexpat/releases/download/R_2_5_0/expat-$(EXPAT_VERSION).tar.bz2

.PHONY: expat
expat: $(EXPAT_WASM_LIB)

$(EXPAT_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(EXPAT_URL) -O $@

$(EXPAT_WASM_LIB): $(EXPAT_TARBALL)
	mkdir -p $(BUILD)/expat-$(EXPAT_VERSION)/build
	tar -C $(BUILD) -xf $(EXPAT_TARBALL)
	cd $(BUILD)/expat-$(EXPAT_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
