PANGO_VERSION = 1.40.14
PANGO_WORDS = $(subst ., ,$(PANGO_VERSION))
PANGO_SHORT := $(word 1,$(PANGO_WORDS)).$(word 2,$(PANGO_WORDS))
PANGO_TARBALL = $(DOWNLOAD)/pango-$(PANGO_VERSION).tar.xz
PANGO_URL = https://download.gnome.org/sources/pango/$(PANGO_SHORT)/pango-$(PANGO_VERSION).tar.xz

.PHONY: pango
pango: $(PANGO_WASM_LIB)

$(PANGO_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PANGO_URL)

$(PANGO_WASM_LIB): $(PANGO_TARBALL) $(PANGO_DEPS)
	rm -rf $(BUILD)/pango-$(PANGO_VERSION)
	mkdir -p $(BUILD)/pango-$(PANGO_VERSION)/build
	tar -C $(BUILD) -xf $(PANGO_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/pango-$(PANGO_VERSION)/." \
	  "$(BUILD)/pango-$(PANGO_VERSION)/patches"
	cd $(BUILD)/pango-$(PANGO_VERSION)/build && quilt push -a && \
	  LDFLAGS="$(LDFLAGS) --use-port=freetype -sUSE_PTHREADS=0" \
	  PTHREAD_CFLAGS=" " \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
