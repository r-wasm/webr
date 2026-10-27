PANGO_VERSION = 1.56.4
PANGO_WORDS = $(subst ., ,$(PANGO_VERSION))
PANGO_SHORT := $(word 1,$(PANGO_WORDS)).$(word 2,$(PANGO_WORDS))
PANGO_TARBALL = $(DOWNLOAD)/pango-$(PANGO_VERSION).tar.xz
PANGO_URL = https://download.gnome.org/sources/pango/$(PANGO_SHORT)/pango-$(PANGO_VERSION).tar.xz

.PHONY: pango
pango: $(PANGO_WASM_LIB)

$(PANGO_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(PANGO_URL) -O $@

$(PANGO_WASM_LIB): $(PANGO_TARBALL) $(PANGO_DEPS)
	rm -rf $(BUILD)/pango-$(PANGO_VERSION)
	mkdir -p $(BUILD)/pango-$(PANGO_VERSION)/build
	tar -C $(BUILD) -xf $(PANGO_TARBALL)
	cd $(BUILD)/pango-$(PANGO_VERSION)/build && \
	  CFLAGS="$(CFLAGS) -Wno-incompatible-pointer-types" \
	  LDFLAGS="$(LDFLAGS) --use-port=freetype -sUSE_PTHREADS=0" \
	  $(WEBR_ROOT)/libs/tools/gen-meson-cross.sh > cross.txt && \
	  emconfigure meson setup .. \
	    --cross-file cross.txt \
	    --prefix=$(WASM) \
	    --default-library=static \
	    --buildtype=release \
	    -Dintrospection=disabled \
	    -Dlibthai=disabled \
	    -Dcairo=enabled \
	    -Dfontconfig=enabled \
	    -Dfreetype=enabled \
	    -Dxft=disabled \
	    -Ddocumentation=false \
	    -Dbuild-testsuite=false \
	    -Dbuild-examples=false && \
	  meson compile && \
	  meson install
