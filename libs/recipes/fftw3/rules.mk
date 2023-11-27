FFTW3_VERSION = 3.3.10
FFTW3_TARBALL = $(DOWNLOAD)/fftw-$(FFTW3_VERSION).tar.gz
FFTW3_URL = https://www.fftw.org/fftw-$(FFTW3_VERSION).tar.gz

.PHONY: fftw3
fftw3: $(FFTW3_WASM_LIB)

$(FFTW3_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(FFTW3_URL) -O $@

$(FFTW3_WASM_LIB): $(FFTW3_TARBALL)
	mkdir -p $(BUILD)/fftw-$(FFTW3_VERSION)/build
	tar -C $(BUILD) -xf $(FFTW3_TARBALL)
	cd $(BUILD)/fftw-$(FFTW3_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install

