HTSLIB_VERSION = 1.24
HTSLIB_TARBALL = $(DOWNLOAD)/htslib-$(HTSLIB_VERSION).tar.bz2
HTSLIB_URL = https://github.com/samtools/htslib/releases/download/$(HTSLIB_VERSION)/htslib-$(HTSLIB_VERSION).tar.bz2

.PHONY: htslib
htslib: $(HTSLIB_WASM_LIB)

$(HTSLIB_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(HTSLIB_URL) -O $@

$(HTSLIB_WASM_LIB): $(HTSLIB_TARBALL) $(XZ_WASM_LIB)
	mkdir -p $(BUILD)
	tar -C $(BUILD) -xf $(HTSLIB_TARBALL)
	cd $(BUILD)/htslib-$(HTSLIB_VERSION) && \
	  emconfigure ./configure \
	    --host=wasm32-unknown-emscripten \
	    --enable-bz2 \
	    --enable-lzma \
	    --disable-libcurl \
	    --disable-gcs \
	    --disable-s3 \
	    --disable-plugins \
	    --without-libdeflate \
	    --prefix=$(WASM) && \
	  emmake make AR=emar RANLIB=emranlib lib-static && \
	  emmake make AR=emar RANLIB=emranlib install-pkgconfig && \
	  mkdir -p $(WASM)/include/htslib && \
	  install -m 644 htslib/*.h $(WASM)/include/htslib && \
	  install -m 644 libhts.a $(WASM)/lib/libhts.a
