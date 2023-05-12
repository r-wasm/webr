GLIB_VERSION = 2.56.4
GLIB_WORDS = $(subst ., ,$(GLIB_VERSION))
GLIB_SHORT := $(word 1,$(GLIB_WORDS)).$(word 2,$(GLIB_WORDS))
GLIB_TARBALL = $(DOWNLOAD)/glib-$(GLIB_VERSION).tar.xz
GLIB_URL = https://download.gnome.org/sources/glib/$(GLIB_SHORT)/glib-$(GLIB_VERSION).tar.xz

.PHONY: glib
glib: $(GLIB_WASM_LIB)

$(GLIB_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(GLIB_URL)

$(GLIB_WASM_LIB): $(GLIB_TARBALL)
	rm -rf $(BUILD)/glib-$(GLIB_VERSION)
	mkdir -p $(BUILD)/glib-$(GLIB_VERSION)
	tar -C $(BUILD) -xf $(GLIB_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/glib-$(GLIB_VERSION)/." \
	  "$(BUILD)/glib-$(GLIB_VERSION)/patches"
	cd $(BUILD)/glib-$(GLIB_VERSION) && quilt push -a && \
	  LIBFFI_CFLAGS=' ' \
	  LIBFFI_LIBS=' ' \
	  emconfigure ./configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --with-threads=no \
	    --with-pcre=internal \
	    --disable-libmount \
	    --host=wasm32-unknown-linux \
	    --prefix=$(WASM) && \
	  emmake make install
