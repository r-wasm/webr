LIBUV_VERSION = 1.44.2
LIBUV_TARBALL = $(DOWNLOAD)/libuv-v$(LIBUV_VERSION)-dist.tar.xz
LIBUV_URL = https://dist.libuv.org/dist/v1.44.2/libuv-v1.44.2-dist.tar.gz

.PHONY: libuv
libuv: $(LIBUV_WASM_LIB)

$(LIBUV_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(LIBUV_URL)

$(LIBUV_WASM_LIB): $(LIBUV_TARBALL) 
	rm -rf $(BUILD)/libuv-$(LIBUV_VERSION)
	mkdir -p $(BUILD)/libuv-$(LIBUV_VERSION)/build
	tar -C $(BUILD) -xf $(LIBUV_TARBALL)
	cp -r "$(WEBR_ROOT)/patches/libuv-$(LIBUV_VERSION)/." \
	  "$(BUILD)/libuv-$(LIBUV_VERSION)/patches"
	cd $(BUILD)/libuv-$(LIBUV_VERSION)/build && quilt push -a && \
	  touch -r ../aclocal.m4 ../* ../m4\* && \
	  LDFLAGS="$(LDFLAGS) -sUSE_PTHREADS=0" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --host=wasm32-unknown-emscripten \
	    --prefix=$(WASM) && \
	  emmake make install
