PCRE_VERSION = 10.39
PCRE_TARBALL = $(DOWNLOAD)/pcre2-$(PCRE_VERSION).tar.gz
PCRE_URL = https://github.com/PhilipHazel/pcre2/releases/download/pcre2-${PCRE_VERSION}/pcre2-$(PCRE_VERSION).tar.gz

.PHONY: pcre
pcre2: $(PCRE_WASM_LIB)

$(PCRE_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PCRE_URL)

$(PCRE_WASM_LIB): $(PCRE_TARBALL)
	mkdir -p $(BUILD)/pcre2-$(PCRE_VERSION)/build
	tar -C $(BUILD) -xf $(PCRE_TARBALL)
	cd $(BUILD)/pcre2-$(PCRE_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
