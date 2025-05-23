HARFBUZZ_VERSION = 7.2.0
HARFBUZZ_TARBALL = $(DOWNLOAD)/harfbuzz-$(HARFBUZZ_VERSION).tar.xz
HARFBUZZ_URL = https://github.com/harfbuzz/harfbuzz/releases/download/$(HARFBUZZ_VERSION)/harfbuzz-$(HARFBUZZ_VERSION).tar.xz

.PHONY: harfbuzz
harfbuzz: $(HARFBUZZ_WASM_LIB)

$(HARFBUZZ_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(HARFBUZZ_URL)

$(HARFBUZZ_WASM_LIB): $(HARFBUZZ_TARBALL)
	mkdir -p $(BUILD)/harfbuzz-$(HARFBUZZ_VERSION)/build
	tar -C $(BUILD) -xf $(HARFBUZZ_TARBALL)
	cd $(BUILD)/harfbuzz-$(HARFBUZZ_VERSION)/build && \
	  LDFLAGS="$(LDFLAGS) --use-port=freetype -sUSE_PTHREADS=0" \
	  emconfigure ../configure \
	    --host=wasm32-unknown-linux \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
