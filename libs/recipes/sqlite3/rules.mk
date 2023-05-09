SQLITE3_VERSION = 3.41.2
SQLITE3_VERSION2 = 3410200
SQLITE3_FILE_NAME = sqlite-autoconf-$(SQLITE3_VERSION2)
SQLITE3_TARBALL = $(DOWNLOAD)/$(SQLITE3_FILE_NAME).tar.gz
SQLITE3_URL = https://sqlite.org/2023/$(SQLITE3_FILE_NAME).tar.gz

.PHONY: sqlite3
sqlite3: $(SQLITE3_WASM_LIB)

$(SQLITE3_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(SQLITE3_URL) -O $@

$(SQLITE3_WASM_LIB): $(SQLITE3_TARBALL)
	mkdir -p $(BUILD)/$(SQLITE3_FILE_NAME)/build
	tar -C $(BUILD) -xf $(SQLITE3_TARBALL)
	cd $(BUILD)/$(SQLITE3_FILE_NAME)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) && \
	  emmake make install
