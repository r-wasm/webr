LIBXSLT_VERSION = 1.1.45
LIBXSLT_WORDS = $(subst ., ,$(LIBXSLT_VERSION))
LIBXSLT_SHORT := $(word 1,$(LIBXSLT_WORDS)).$(word 2,$(LIBXSLT_WORDS))
LIBXSLT_TARBALL = $(DOWNLOAD)/libxslt-$(LIBXSLT_VERSION).tar.xz
LIBXSLT_URL = https://download.gnome.org/sources/libxslt/$(LIBXSLT_SHORT)/libxslt-$(LIBXSLT_VERSION).tar.xz

.PHONY: libxslt
libxslt: $(LIBXSLT_WASM_LIB) $(LIBEXSLT_WASM_LIB)

$(LIBXSLT_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(LIBXSLT_URL)

$(LIBEXSLT_WASM_LIB): $(LIBXSLT_WASM_LIB)

$(LIBXSLT_WASM_LIB): $(LIBXSLT_TARBALL) $(LIBXML2_WASM_LIB)
	mkdir -p $(BUILD)/libxslt-$(LIBXSLT_VERSION)/build
	tar -C $(BUILD) -xf $(LIBXSLT_TARBALL)
	cd $(BUILD)/libxslt-$(LIBXSLT_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --without-python \
	    --without-crypto \
	    --with-libxml-prefix=$(WASM) \
	    --prefix=$(WASM) && \
	  emmake make install
