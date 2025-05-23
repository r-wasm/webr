FC_VERSION = 2.12.5
FC_TARBALL = $(DOWNLOAD)/fontconfig-$(FC_VERSION).tar.gz
FC_URL = https://www.freedesktop.org/software/fontconfig/release/fontconfig-$(FC_VERSION).tar.gz

.PHONY: fontconfig
fontconfig: $(FC_DEPS)

$(FC_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(FC_URL)

$(FC_DEPS): $(FC_TARBALL) $(LIBXML2_WASM_LIB) $(EM_PKG_CONFIG_PATH)/freetype2.pc
	rm -rf $(BUILD)/fontconfig-$(FC_VERSION)
	mkdir -p $(BUILD)/fontconfig-$(FC_VERSION)/build
	tar -C $(BUILD) -xf $(FC_TARBALL) --exclude=fcobjshash.h
	cp -r "$(WEBR_ROOT)/patches/fontconfig-$(FC_VERSION)/." \
	  "$(BUILD)/fontconfig-$(FC_VERSION)/patches"
	cd $(BUILD)/fontconfig-$(FC_VERSION)/build && quilt push -a && \
	  LDFLAGS="$(LDFLAGS) --use-port=freetype -sUSE_PTHREADS=0" \
	  PTHREAD_CFLAGS=" " \
	  emconfigure ../configure \
	    ac_cv_func_fstatfs=no \
	    ac_cv_func_link=no \
	    --enable-shared=no \
	    --enable-static=yes \
	    --enable-libxml2 \
	    --prefix=$(WASM) && \
	  emmake make RUN_FC_CACHE_TEST=false install
	cd $(BUILD)/fontconfig-$(FC_VERSION)/build/fc-cache && \
	  make clean && make AM_LDFLAGS="-s NODERAWFS=1"
