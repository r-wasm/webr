HARFBUZZ_VERSION = 11.5.0
HARFBUZZ_TARBALL = $(DOWNLOAD)/harfbuzz-$(HARFBUZZ_VERSION).tar.xz
HARFBUZZ_URL = https://github.com/harfbuzz/harfbuzz/releases/download/$(HARFBUZZ_VERSION)/harfbuzz-$(HARFBUZZ_VERSION).tar.xz

.PHONY: harfbuzz
harfbuzz: $(HARFBUZZ_WASM_LIB)

$(HARFBUZZ_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(HARFBUZZ_URL) -O $@

$(HARFBUZZ_WASM_LIB): $(HARFBUZZ_TARBALL) $(EM_PKG_CONFIG_PATH)/freetype2.pc
	rm -rf $(BUILD)/harfbuzz-$(HARFBUZZ_VERSION)
	mkdir -p $(BUILD)/harfbuzz-$(HARFBUZZ_VERSION)/build
	tar -C $(BUILD) -xf $(HARFBUZZ_TARBALL)
	cd $(BUILD)/harfbuzz-$(HARFBUZZ_VERSION)/build && \
	  LDFLAGS="$(LDFLAGS) --use-port=freetype -sUSE_PTHREADS=0" \
	  $(WEBR_ROOT)/libs/tools/gen-meson-cross.sh > cross.txt && \
	  emconfigure meson setup .. \
	    --cross-file cross.txt \
	    --prefix=$(WASM) \
	    --default-library=static \
	    --buildtype=release \
	    -Dtests=disabled \
	    -Ddocs=disabled \
	    -Dutilities=disabled \
	    -Dbenchmark=disabled \
	    -Dintrospection=disabled \
	    -Dicu=disabled \
	    -Dglib=disabled \
	    -Dgobject=disabled \
	    -Dcairo=disabled \
	    -Dchafa=disabled \
	    -Dfreetype=enabled \
	    -Dgraphite=disabled \
	    -Dwasm=disabled \
	    -Dexperimental_api=false && \
	  meson compile && \
	  meson install
