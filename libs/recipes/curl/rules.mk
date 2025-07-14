CURL_VERSION = 8.14.1
CURL_TARBALL = $(DOWNLOAD)/curl-$(CURL_VERSION).tar.gz
CURL_URL = https://curl.se/download/curl-$(CURL_VERSION).tar.gz

.PHONY: curl
curl: $(CURL_WASM_LIB)

$(CURL_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget $(CURL_URL) -O $@

$(CURL_WASM_LIB): $(CURL_TARBALL) $(NGHTTP2_WASM_LIB) $(OPENSSL_WASM_LIB)
	mkdir -p $(BUILD)/curl-$(CURL_VERSION)/build
	tar -C $(BUILD) -xf $(CURL_TARBALL)
	cd $(BUILD)/curl-$(CURL_VERSION)/build && \
	  PKG_CONFIG="pkg-config --static" emconfigure ../configure \
	    --enable-shared=no \
	    --enable-static=yes \
	    --prefix=$(WASM) \
	    --with-openssl \
	    --with-zlib \
	    --with-nghttp2 \
	    --disable-threaded-resolver \
	    --without-libpsl \
	    --disable-netrc \
	    --disable-ipv6 \
	    --disable-tftp \
	    --disable-ntlm-wb \
	    --enable-websockets \
	    --disable-ftp \
	    --disable-file \
	    --disable-gopher \
	    --disable-imap \
	    --disable-mqtt \
	    --disable-pop3 \
	    --disable-rtsp \
	    --disable-smb \
	    --disable-smtp \
	    --disable-telnet \
	    --disable-dict && \
	  emmake make install


