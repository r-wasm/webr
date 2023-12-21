GSL_VERSION = 2.7.1
GSL_TARBALL = $(DOWNLOAD)/gsl-$(GSL_VERSION).tar.gz
GSL_URL = https://ftp.gnu.org/gnu/gsl/gsl-$(GSL_VERSION).tar.gz

.PHONY: gsl
gsl: $(GSL_WASM_LIB)

$(GSL_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(GSL_URL) -O $@

$(GSL_WASM_LIB): $(GSL_TARBALL)
	mkdir -p $(BUILD)/gsl-$(GSL_VERSION)/build
	tar -C $(BUILD) -xf $(GSL_TARBALL)
	cd $(BUILD)/gsl-$(GSL_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make &&\
	  emmake make install

