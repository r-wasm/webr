UDUNITS_VERSION = 2.2.28
UDUNITS_TARBALL = $(DOWNLOAD)/udunits-$(UDUNITS_VERSION).tar.gz
UDUNITS_URL = https://downloads.unidata.ucar.edu/udunits/2.2.28/udunits-$(UDUNITS_VERSION).tar.gz

.PHONY: udunits
udunits: $(UDUNITS_WASM_LIB)

$(UDUNITS_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(UDUNITS_URL) -O $@

$(UDUNITS_WASM_LIB): $(UDUNITS_TARBALL) $(EXPAT_WASM_LIB)
	mkdir -p $(BUILD)/udunits-$(UDUNITS_VERSION)/build
	tar -C $(BUILD) -xf $(UDUNITS_TARBALL)
	cd $(BUILD)/udunits-$(UDUNITS_VERSION)/build && \
	  CPPFLAGS="$(CPPFLAGS) -D__linux__" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
