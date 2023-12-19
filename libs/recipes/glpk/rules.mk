GLPK_VERSION = 5.0
GLPK_TARBALL = $(DOWNLOAD)/glpk-$(GLPK_VERSION).tar.gz
GLPK_URL = https://ftp.gnu.org/gnu/glpk/glpk-$(GLPK_VERSION).tar.gz

.PHONY: glpk
glpk: $(GLPK_WASM_LIB)

$(GLPK_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(GLPK_URL) -O $@

$(GLPK_WASM_LIB): $(GLPK_TARBALL) $(GMP_WASM_LIB)
	mkdir -p $(BUILD)/glpk-$(GLPK_VERSION)/build
	tar -C $(BUILD) -xf $(GLPK_TARBALL)
	cd $(BUILD)/glpk-$(GLPK_VERSION)/build && \
	  emconfigure ../configure \
	    --with-gmp \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install

