#  https://gitlab.dkrz.de/k202009/libaec/-/blob/master/INSTALL.md?ref_type=heads
LIBAEC_VERSION = 1.1.3
LIBAEC_TARBALL = $(DOWNLOAD)/libaec-$(LIBAEC_VERSION).tar.gz
LIBAEC_URL = https://gitlab.dkrz.de/-/project/117/uploads/dc5fc087b645866c14fa22320d91fb27/libaec-1.1.3.tar.gz

.PHONY: libaec
libaec: $(LIBAEC_WASM_LIB)

$(LIBAEC_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(LIBAEC_URL) -O $@

$(LIBAEC_WASM_LIB): $(LIBAEC_TARBALL)
	mkdir -p $(BUILD)/libaec-$(LIBAEC_VERSION)/build
	tar -C $(BUILD)/libaec-$(LIBAEC_VERSION) -xf $(LIBAEC_TARBALL)
	cd $(BUILD)/libaec-$(LIBAEC_VERSION)/build && \
	emconfigure ../libaec-$(LIBAEC_VERSION)/configure \
	  --enable-shared=no \
	  --enable-static=yes \
	  --prefix=$(WASM) && \
	emmake make install
