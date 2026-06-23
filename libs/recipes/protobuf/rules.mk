# Try to match the version with 'libprotoc-dev' on the host to support R packages (protolite, tfevents) using the 'protoc' codegen utility.
PROTOBUF_VERSION = 3.21.12
PROTOBUF_TARBALL = $(DOWNLOAD)/protobuf-cpp-$(PROTOBUF_VERSION).tar.gz
PROTOBUF_URL = https://github.com/protocolbuffers/protobuf/releases/download/v21.12/protobuf-cpp-$(PROTOBUF_VERSION).tar.gz

.PHONY: protobuf
protobuf: $(PROTOBUF_WASM_LIB)

$(PROTOBUF_TARBALL):
	mkdir -p $(DOWNLOAD)
	wget -q -O $@ $(PROTOBUF_URL)

$(PROTOBUF_WASM_LIB): $(PROTOBUF_TARBALL)
	mkdir -p $(BUILD)/protobuf-$(PROTOBUF_VERSION)/build
	tar -C $(BUILD) -xf $(PROTOBUF_TARBALL)
	cd $(BUILD)/protobuf-$(PROTOBUF_VERSION)/build && \
	  emcmake cmake \
	    -DCMAKE_POLICY_VERSION_MINIMUM=3.5 \
	    -DCMAKE_POSITION_INDEPENDENT_CODE=ON \
	    -DCMAKE_BUILD_TYPE=Release \
	    -DCMAKE_FIND_ROOT_PATH=$(WASM) \
	    -DCMAKE_INSTALL_PREFIX:PATH=$(WASM) \
	    -DBUILD_SHARED_LIBS=OFF \
	    -Dprotobuf_BUILD_SHARED_LIBS=OFF \
	    -Dprotobuf_BUILD_TESTS=OFF \
	    -Dprotobuf_BUILD_PROTOC_BINARIES=OFF \
	    -Dprotobuf_BUILD_LIBPROTOC=OFF \
	    -Dprotobuf_WITH_ZLIB=OFF \
	    .. && \
	  emmake make install
