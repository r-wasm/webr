IMAGEMAGICK_VERSION = 6.9.13-1
IMAGEMAGICK_TARBALL = $(DOWNLOAD)/imagemagick-$(IMAGEMAGICK_VERSION).tar.gz
IMAGEMAGICK_URL = https://imagemagick.org/archive/releases/ImageMagick-$(IMAGEMAGICK_VERSION).tar.xz

.PHONY: imagemagick
imagemagick: $(IMAGEMAGICK_WASM_LIB)

$(IMAGEMAGICK_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(IMAGEMAGICK_URL) -O $@

$(IMAGEMAGICK_WASM_LIB): $(IMAGEMAGICK_TARBALL) $(LIBWEBP_WASM_LIB) $(LIBPNG_WASM_LIB) $(LIBTIFF_WASM_LIB) $(LIBJPEG_WASM_LIB) $(XZ_WASM_LIB) $(FC_WASM_LIB) $(LIBXML2_WASM_LIB) $(PANGO_WASM_LIB)
	mkdir -p $(BUILD)/ImageMagick-$(IMAGEMAGICK_VERSION)/build
	tar -C $(BUILD) -xf $(IMAGEMAGICK_TARBALL)
	cd $(BUILD)/ImageMagick-$(IMAGEMAGICK_VERSION)/build && \
	  PKG_CONFIG="pkg-config --static" emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --disable-opencl \
	    --disable-openmp \
	    --without-modules \
	    --enable-zero-configuration \
	    --without-threads \
	    --with-freetype \
	    --with-fontconfig \
	    --with-webp \
	    --with-png \
	    --with-jpeg \
	    --with-tiff \
	    --with-lzma \
	    --with-xml \
	    --with-pango \
	    --with-magick-plus-plus \
	    --without-x \
	    --prefix=$(WASM) && \
	  emmake make install
