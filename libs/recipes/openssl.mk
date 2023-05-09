OPENSSL_VERSION = 3.1.0
OPENSSL_TARBALL = $(DOWNLOAD)/openssl-$(OPENSSL_VERSION).tar.gz
OPENSSL_URL = https://github.com/openssl/openssl/archive/refs/tags/openssl-$(OPENSSL_VERSION).tar.gz

OPENSSL_WASM_LIB = $(WASM)/lib/libssl.a

.PHONY: openssl
openssl: $(OPENSSL_WASM_LIB)

$(OPENSSL_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(OPENSSL_URL)

$(OPENSSL_WASM_LIB): $(OPENSSL_TARBALL)
	mkdir -p $(BUILD)/openssl-openssl-$(OPENSSL_VERSION)/build
	tar -C $(BUILD) -xf $(OPENSSL_TARBALL)
	cd $(BUILD)/openssl-openssl-$(OPENSSL_VERSION)/build && \
	  CFLAGS="$(WASM_CFLAGS)" \
	  emconfigure ../Configure \
	    darwin-i386 \
	    CC="cc" \
	    CXX="++" \
	    AR="ar" \
	    RANLIB="ranlib" \
	    -static \
	    -no-sock \
	    -no-tests \
	    -no-asm \
	    --prefix=$(WASM) && \
	  sed -i.bak '/^CNF_CFLAGS=/d' $(BUILD)/openssl-openssl-$(OPENSSL_VERSION)/build/Makefile && \
	  sed -i.bak '/^CNF_LDFLAGS=/d' $(BUILD)/openssl-openssl-$(OPENSSL_VERSION)/build/Makefile && \
	  emmake $(MAKE) build_generated libssl.a libcrypto.a && \
	  emmake $(MAKE) install
