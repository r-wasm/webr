MPFR_VERSION = 4.2.1
MPFR_TARBALL = $(DOWNLOAD)/mpfr-$(MPFR_VERSION).tar.gz
MPFR_URL = https://ftp.gnu.org/gnu/mpfr/mpfr-$(MPFR_VERSION).tar.xz

.PHONY: mpfr
mpfr: $(MPFR_WASM_LIB)

$(MPFR_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(MPFR_URL) -O $@

$(MPFR_WASM_LIB): $(MPFR_TARBALL) $(GMP_WASM_LIB)
	mkdir -p $(BUILD)/mpfr-$(MPFR_VERSION)/build
	tar -C $(BUILD) -xf $(MPFR_TARBALL)
	cd $(BUILD)/mpfr-$(MPFR_VERSION)/build && \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --disable-thread-safe \
	    --prefix=$(WASM) && \
	  emmake make install

