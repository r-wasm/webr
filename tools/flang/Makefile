WEBR_ROOT = $(abspath ../..)
ROOT = $(abspath .)

BUILD = $(ROOT)/build
SOURCE = $(ROOT)/f18-llvm-project

TOOLS = $(WEBR_ROOT)/tools
HOST = $(WEBR_ROOT)/host
WASM = $(WEBR_ROOT)/wasm

FLANG_BIN = $(BUILD)/bin/tco $(BUILD)/bin/bbc $(BUILD)/bin/llc
RUNTIME_WASM_LIB = $(BUILD)/webr/libFortranRuntime.a

# Configure your local environment in this file
-include ~/.webr-config.mk

NUM_CORES ?= 4


.PHONY: all
all: $(FLANG_BIN) $(RUNTIME_WASM_LIB)


$(SOURCE):
	git clone --single-branch -b fix-webr --depth=1 https://github.com/lionel-/f18-llvm-project

$(FLANG_BIN): $(SOURCE)
	mkdir -p $(BUILD) && \
	cd $(BUILD) && \
	CMAKE_BUILD_PARALLEL_LEVEL=$(NUM_CORES) cmake ../f18-llvm-project/llvm \
	  -DCMAKE_INSTALL_PREFIX:PATH=$(HOST) \
	  -DCMAKE_BUILD_TYPE=RelWithDebInfo \
	  -DLLVM_TARGETS_TO_BUILD="host;WebAssembly" \
	  -DLLVM_ENABLE_PROJECTS="clang;flang;mlir" \
	  -DCMAKE_CXX_STANDARD=17 \
	  -DLLVM_BUILD_TOOLS=On \
	  -DLLVM_INSTALL_UTILS=On && \
	make -j$(NUM_CORES)


.PHONY: wasm-runtime
wasm-runtime: $(FLANG_BIN) $(RUNTIME_WASM_LIB)

RUNTIME_CFLAGS := $(RUNTIME_CFLAGS)
RUNTIME_CFLAGS += -I$(BUILD)/include -I$(BUILD)/tools/flang/runtime
RUNTIME_CFLAGS += -I$(SOURCE)/flang/include -I$(SOURCE)/llvm/include
RUNTIME_CFLAGS += -DFLANG_LITTLE_ENDIAN -fPIC

RUNTIME_CXXFLAGS := $(RUNTIME_CXXFLAGS)
RUNTIME_CXXFLAGS += $(RUNTIME_CFLAGS) -std=c++17 -Wno-c++11-narrowing

$(RUNTIME_WASM_LIB): missing-math.c
	CFLAGS="$(RUNTIME_CFLAGS)" \
	  CXXFLAGS="$(RUNTIME_CXXFLAGS)" \
	  BUILD="$(BUILD)" \
	  SOURCE="$(SOURCE)" \
	  ROOT="$(ROOT)" \
	  ./build-runtime.sh

.PHONY: install
install: $(FLANG_BIN) $(RUNTIME_WASM_LIB)
	mkdir -p $(HOST)/bin $(WASM)/lib
	cp $(FLANG_BIN) $(HOST)/bin
	cp $(RUNTIME_WASM_LIB) $(WASM)/lib
	sed -e "s|@BIN_PATH@|$(HOST)/bin|" emfc.in > emfc
	chmod +x emfc

.PHONY: check
check:
	cd $(BUILD) && make check-flang

.PHONY: clean
clean:
	cmake --build $(BUILD) --target clean
