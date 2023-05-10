PIXMAN_VERSION = 0.38.4
PIXMAN_TARBALL = $(DOWNLOAD)/pixman-$(PIXMAN_VERSION).tar.gz
PIXMAN_URL = https://cairographics.org/releases/pixman-$(PIXMAN_VERSION).tar.gz

.PHONY: pixman
pixman: $(PIXMAN_WASM_LIB)

$(PIXMAN_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PIXMAN_URL)

$(PIXMAN_WASM_LIB): $(PIXMAN_TARBALL) $(LIBPNG_WASM_LIB)
	mkdir -p $(BUILD)/pixman-$(PIXMAN_VERSION)/build
	tar -C $(BUILD) -xf $(PIXMAN_TARBALL)
	sed -i.bak 's/support_for_pthreads=yes/support_for_pthreads=no/g' \
	  $(BUILD)/pixman-$(PIXMAN_VERSION)/configure
	cd $(BUILD)/pixman-$(PIXMAN_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
