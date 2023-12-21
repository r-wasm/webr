GMP_VERSION = 6.3.0
GMP_TARBALL = $(DOWNLOAD)/gmp-$(GMP_VERSION).tar.gz
GMP_URL = https://ftp.gnu.org/gnu/gmp/gmp-$(GMP_VERSION).tar.xz

# Cross-compile fix for Emscripten-on-macOS
UNAME := $(shell uname)
ifeq ($(UNAME),Darwin)
	HOST_CFLAGS += "-I/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include"
	HOST_CFLAGS += "-L/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/lib"
endif

.PHONY: gmp
gmp: $(GMP_WASM_LIB)

$(GMP_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(GMP_URL) -O $@

$(GMP_WASM_LIB): $(GMP_TARBALL)
	mkdir -p $(BUILD)/gmp-$(GMP_VERSION)/build
	tar -C $(BUILD) -xf $(GMP_TARBALL)
	cd $(BUILD)/gmp-$(GMP_VERSION)/build && \
	    emconfigure bash -c '\
	      HOST_CC="$${HOST_CC} $(HOST_CFLAGS)" ../configure \
	      --host=wasm32-unknown-emscripten \
	      --enable-shared=no \
	      --enable-static=yes \
	      --disable-assembly \
	      --enable-cxx \
	      --prefix=$(WASM) \
	    ' && \
	  emmake make install

