LIBXML2_VERSION = 2.10.3
LIBXML2_WORDS = $(subst ., ,$(LIBXML2_VERSION))
LIBXML2_SHORT := $(word 1,$(LIBXML2_WORDS)).$(word 2,$(LIBXML2_WORDS))
LIBXML2_TARBALL = $(DOWNLOAD)/libxml2-$(LIBXML2_VERSION).tar.xz
LIBXML2_URL = https://download.gnome.org/sources/libxml2/$(LIBXML2_SHORT)/libxml2-$(LIBXML2_VERSION).tar.xz

.PHONY: libxml2
libxml2: $(LIBXML2_WASM_LIB)

$(LIBXML2_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(LIBXML2_URL)

$(LIBXML2_WASM_LIB): $(LIBXML2_TARBALL) $(XZ_WASM_LIB)
	mkdir -p $(BUILD)/libxml2-$(LIBXML2_VERSION)/build
	tar -C $(BUILD) -xf $(LIBXML2_TARBALL)
	cd $(BUILD)/libxml2-$(LIBXML2_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --without-python \
	    --without-threads \
	    --prefix=$(WASM) && \
	  emmake make install
