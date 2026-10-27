FRIBIDI_VERSION = 1.0.16
FRIBIDI_TARBALL = $(DOWNLOAD)/fribidi-$(FRIBIDI_VERSION).tar.xz
FRIBIDI_URL = https://github.com/fribidi/fribidi/releases/download/v$(FRIBIDI_VERSION)/fribidi-$(FRIBIDI_VERSION).tar.xz

.PHONY: fribidi
fribidi: $(FRIBIDI_WASM_LIB)

$(FRIBIDI_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(FRIBIDI_URL) -O $@

$(FRIBIDI_WASM_LIB): $(FRIBIDI_TARBALL)
	rm -rf $(BUILD)/fribidi-$(FRIBIDI_VERSION)
	mkdir -p $(BUILD)/fribidi-$(FRIBIDI_VERSION)/build
	tar -C $(BUILD) -xf $(FRIBIDI_TARBALL)
	cd $(BUILD)/fribidi-$(FRIBIDI_VERSION)/build && \
	  $(WEBR_ROOT)/libs/tools/gen-meson-cross.sh > cross.txt && \
	  emconfigure meson setup .. \
	    --cross-file cross.txt \
	    --prefix=$(WASM) \
	    --default-library=static \
	    --buildtype=release \
	    -Dtests=false \
	    -Ddocs=false \
	    -Dbin=false && \
	  meson compile && \
	  meson install
