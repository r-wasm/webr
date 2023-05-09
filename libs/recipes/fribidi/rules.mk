FRIBIDI_VERSION = 1.0.12
FRIBIDI_TARBALL = $(DOWNLOAD)/fribidi-$(FRIBIDI_VERSION).tar.xz
FRIBIDI_URL = https://github.com/fribidi/fribidi/releases/download/v1.0.12/fribidi-$(FRIBIDI_VERSION).tar.xz

.PHONY: fribidi
fribidi: $(FRIBIDI_WASM_LIB)

$(FRIBIDI_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(FRIBIDI_URL) -O $@

$(FRIBIDI_WASM_LIB): $(FRIBIDI_TARBALL)
	mkdir -p $(BUILD)/fribidi-$(FRIBIDI_VERSION)/build
	tar -C $(BUILD) -xf $(FRIBIDI_TARBALL)
	cd $(BUILD)/fribidi-$(FRIBIDI_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
