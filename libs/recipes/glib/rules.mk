GLIB_VERSION = 2.84.4
GLIB_WORDS = $(subst ., ,$(GLIB_VERSION))
GLIB_SHORT := $(word 1,$(GLIB_WORDS)).$(word 2,$(GLIB_WORDS))
GLIB_TARBALL = $(DOWNLOAD)/glib-$(GLIB_VERSION).tar.xz
GLIB_URL = https://download.gnome.org/sources/glib/$(GLIB_SHORT)/glib-$(GLIB_VERSION).tar.xz

.PHONY: glib
glib: $(GLIB_WASM_LIB)

$(GLIB_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(GLIB_URL) -O $@

$(GLIB_WASM_LIB): $(GLIB_TARBALL) $(LIBFFI_WASM_LIB) $(PCRE_WASM_LIB)
	rm -rf $(BUILD)/glib-$(GLIB_VERSION)
	mkdir -p $(BUILD)/glib-$(GLIB_VERSION)/build
	tar -C $(BUILD) -xf $(GLIB_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/glib-$(GLIB_VERSION)/." \
	  "$(BUILD)/glib-$(GLIB_VERSION)/patches"
	cd $(BUILD)/glib-$(GLIB_VERSION)/build && quilt push -a && \
	  CFLAGS="$(CFLAGS) -Wno-incompatible-function-pointer-types -Wno-incompatible-pointer-types -Wno-c2y-extensions" \
	  LDFLAGS="$(LDFLAGS) -sUSE_PTHREADS=0" \
	  $(WEBR_ROOT)/libs/tools/gen-meson-cross.sh > cross.txt && \
	  emconfigure meson setup .. \
	    --cross-file cross.txt \
	    --prefix=$(WASM) \
	    --default-library=static \
	    --buildtype=release \
	    --wrap-mode=default \
	    -Dtests=false \
	    -Dinstalled_tests=false \
	    -Dnls=disabled \
	    -Dlibmount=disabled \
	    -Dselinux=disabled \
	    -Dxattr=false \
	    -Dman-pages=disabled \
	    -Ddocumentation=false \
	    -Dintrospection=disabled \
	    -Dsysprof=disabled \
	    -Ddtrace=disabled \
	    -Dsystemtap=disabled \
	    -Dglib_assert=false \
	    -Dglib_debug=disabled \
	    -Dmultiarch=false && \
	  meson compile && \
	  meson install
