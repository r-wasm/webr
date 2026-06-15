LIBFFI_VERSION = 3.5.2
LIBFFI_TARBALL = $(DOWNLOAD)/libffi-$(LIBFFI_VERSION).tar.gz
LIBFFI_URL = https://github.com/libffi/libffi/releases/download/v$(LIBFFI_VERSION)/libffi-$(LIBFFI_VERSION).tar.gz

.PHONY: libffi
libffi: $(LIBFFI_WASM_LIB)

$(LIBFFI_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(LIBFFI_URL)

# We build libffi from upstream rather than letting glib's meson fetch its
# `gstreamer/meson-ports/libffi` wrap subproject -- that wrap's meson.build
# rejects host wasm32/emscripten with "Unsupported pair", whereas upstream
# libffi's autotools configure.host has had wasm32 support since 3.5.0.
$(LIBFFI_WASM_LIB): $(LIBFFI_TARBALL)
	rm -rf $(BUILD)/libffi-$(LIBFFI_VERSION)
	mkdir -p $(BUILD)/libffi-$(LIBFFI_VERSION)/build
	tar -C $(BUILD) -xf $(LIBFFI_TARBALL)
	cd $(BUILD)/libffi-$(LIBFFI_VERSION)/build && \
	  emconfigure ../configure \
	    --host=wasm32-unknown-linux \
	    --enable-shared=no \
	    --enable-static=yes \
	    --disable-docs \
	    --disable-multi-os-directory \
	    --prefix=$(WASM) && \
	  emmake make install
