FC_VERSION = 2.17.1
FC_TARBALL = $(DOWNLOAD)/fontconfig-$(FC_VERSION).tar.xz
FC_URL = https://gitlab.freedesktop.org/api/v4/projects/fontconfig%2Ffontconfig/packages/generic/fontconfig/$(FC_VERSION)/fontconfig-$(FC_VERSION).tar.xz

.PHONY: fontconfig
fontconfig: $(FC_DEPS)

$(FC_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(FC_URL)

# fontconfig links the fc-cache utility statically together with libfontconfig.a;
# we want that fc-cache to run under Node with raw FS access so the fonts
# recipe can pre-populate the cache. -sNODERAWFS=1 only affects the linked
# executable, not the static archive cairo/imagemagick consume.
#
# We use expat (not libxml2) as the XML backend -- cairo's util/cairo-script
# helper executables link libfontconfig.a without picking up libxml2's private
# deps via pkg-config, and expat is also a much smaller dependency.
$(FC_DEPS): $(FC_TARBALL) $(EXPAT_WASM_LIB) $(EM_PKG_CONFIG_PATH)/freetype2.pc
	rm -rf $(BUILD)/fontconfig-$(FC_VERSION)
	mkdir -p $(BUILD)/fontconfig-$(FC_VERSION)/build
	tar -C $(BUILD) -xf $(FC_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/fontconfig-$(FC_VERSION)/." \
	  "$(BUILD)/fontconfig-$(FC_VERSION)/patches"
	cd $(BUILD)/fontconfig-$(FC_VERSION)/build && quilt push -a && \
	  LDFLAGS="$(LDFLAGS) --use-port=freetype -sUSE_PTHREADS=0 -sNODERAWFS=1" \
	  $(WEBR_ROOT)/libs/tools/gen-meson-cross.sh > cross.txt && \
	  emconfigure meson setup .. \
	    --cross-file cross.txt \
	    --prefix=$(WASM) \
	    --default-library=static \
	    --buildtype=release \
	    -Dxml-backend=expat \
	    -Dfontations=disabled \
	    -Dtests=disabled \
	    -Dtools=enabled \
	    -Dcache-build=disabled \
	    -Dnls=disabled \
	    -Ddoc=disabled \
	    -Ddoc-man=disabled \
	    -Diconv=disabled && \
	  meson compile && \
	  meson install
